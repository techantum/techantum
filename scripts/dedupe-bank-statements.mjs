/**
 * Remove duplicate bank statement lines created when the same file was imported
 * under different statement months (old fingerprints included month/year).
 * Keeps the earliest row in each natural-key group; cancels later copies + linked ledgers.
 */
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import { join, resolve } from 'path';

function loadPg() {
  const roots = [process.env.NODE_PATH, resolve(process.cwd(), 'node_modules')].filter(Boolean);
  for (const root of roots) {
    try {
      const require = createRequire(pathToFileURL(join(root, 'pg/package.json')));
      return require('pg');
    } catch {
      /* try next */
    }
  }
  throw new Error('Cannot find package pg.');
}

const pg = loadPg();
const text = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
for (const raw of text.split(/\r?\n/)) {
  const line = raw.replace(/^\uFEFF/, '').trim();
  if (!line || line.startsWith('#')) continue;
  const eq = line.indexOf('=');
  if (eq <= 0) continue;
  const key = line.slice(0, eq).trim();
  let val = line.slice(eq + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
  if (!process.env[key]?.trim()) process.env[key] = val;
}

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
const client = new pg.Client({
  connectionString: url,
  ssl: /supabase\.com/i.test(url || '') ? { rejectUnauthorized: false } : undefined,
});

function contentFingerprint(row) {
  return createHash('sha256')
    .update(
      [
        String(row.txn_date).slice(0, 10),
        row.direction,
        Number(row.amount).toFixed(2),
        String(row.description || '')
          .toLowerCase()
          .trim(),
        String(row.reference || '')
          .toLowerCase()
          .trim(),
      ].join('|')
    )
    .digest('hex');
}

await client.connect();
await client.query('BEGIN');
try {
  const { rows: groups } = await client.query(`
    SELECT txn_date::text AS txn_date, direction, amount::text AS amount,
           lower(btrim(description)) AS description_key,
           lower(btrim(COALESCE(reference,''))) AS reference_key,
           array_agg(id ORDER BY created_at ASC, id ASC) AS ids
    FROM finance_bank_statement_lines
    WHERE status IN ('posted','duplicate')
    GROUP BY txn_date, direction, amount, lower(btrim(description)), lower(btrim(COALESCE(reference,'')))
    HAVING COUNT(*) > 1
  `);

  let removedLines = 0;
  let cancelledIncome = 0;
  let cancelledExpense = 0;
  let cancelledSridhar = 0;
  let reversedTxn = 0;

  for (const group of groups) {
    const keepId = group.ids[0];
    const dropIds = group.ids.slice(1);
    for (const dropId of dropIds) {
      const { rows } = await client.query(
        `SELECT id, income_id, expense_id, sridhar_id, transaction_id, statement_id
         FROM finance_bank_statement_lines WHERE id = $1 FOR UPDATE`,
        [dropId]
      );
      const line = rows[0];
      if (!line) continue;

      if (line.transaction_id) {
        await client.query(
          `UPDATE finance_transactions SET status='reversed', updated_at=NOW()
           WHERE id=$1 AND status='active'`,
          [line.transaction_id]
        );
        reversedTxn += 1;
      }
      const keep = await client.query(
        `SELECT income_id, expense_id, sridhar_id FROM finance_bank_statement_lines WHERE id=$1`,
        [keepId]
      );
      const keeper = keep.rows[0] || {};

      if (line.income_id && line.income_id !== keeper.income_id) {
        await client.query(`UPDATE finance_income SET status='cancelled', updated_at=NOW() WHERE id=$1 AND status='active'`, [
          line.income_id,
        ]);
        cancelledIncome += 1;
      }
      if (line.expense_id && line.expense_id !== keeper.expense_id) {
        await client.query(
          `UPDATE finance_expenses
           SET status='cancelled', cancelled_reason='Duplicate bank import removed', cancelled_at=NOW(), updated_at=NOW()
           WHERE id=$1 AND status='recorded'`,
          [line.expense_id]
        );
        await client.query(
          `UPDATE finance_expense_payments SET status='reversed', cancelled_at=NOW(), cancelled_reason='Duplicate bank import removed'
           WHERE expense_id=$1 AND status='active'`,
          [line.expense_id]
        );
        await client.query(
          `UPDATE finance_transactions SET status='reversed'
           WHERE reference_type IN ('expense_payment','bank_statement_line')
             AND (
               reference_id IN (SELECT id FROM finance_expense_payments WHERE expense_id=$1)
               OR reference_id = $2
             )`,
          [line.expense_id, dropId]
        );
        cancelledExpense += 1;
      }
      if (line.sridhar_id && line.sridhar_id !== keeper.sridhar_id) {
        await client.query(`UPDATE finance_sridhar_funding SET status='cancelled', updated_at=NOW() WHERE id=$1 AND status='active'`, [
          line.sridhar_id,
        ]);
        cancelledSridhar += 1;
      }

      await client.query(
        `UPDATE finance_bank_statement_lines
         SET status='duplicate', income_id=NULL, expense_id=NULL, sridhar_id=NULL, transaction_id=NULL, updated_at=NOW()
         WHERE id=$1`,
        [dropId]
      );
      removedLines += 1;
    }
  }

  // Rehash remaining posted lines to content-only fingerprints
  const { rows: live } = await client.query(
    `SELECT id, txn_date::text, direction, amount::text, description, reference
     FROM finance_bank_statement_lines WHERE status = 'posted'`
  );
  const used = new Set();
  let rehashed = 0;
  for (const row of live) {
    let fp = contentFingerprint(row);
    if (used.has(fp)) {
      // Extremely rare collision after cleanup — append id
      fp = createHash('sha256').update(`${fp}|${row.id}`).digest('hex');
    }
    used.add(fp);
    await client.query(`UPDATE finance_bank_statement_lines SET fingerprint=$2 WHERE id=$1`, [row.id, fp]);
    rehashed += 1;
  }

  // Soft-cancel statements that no longer have posted lines
  const { rows: emptyStmts } = await client.query(`
    SELECT s.id
    FROM finance_bank_statements s
    WHERE s.status <> 'cancelled'
      AND NOT EXISTS (
        SELECT 1 FROM finance_bank_statement_lines l
        WHERE l.statement_id = s.id AND l.status = 'posted'
      )
  `);
  for (const stmt of emptyStmts) {
    await client.query(`UPDATE finance_bank_statements SET status='cancelled', updated_at=NOW() WHERE id=$1`, [stmt.id]);
  }

  // Refresh statement aggregates for remaining statements
  await client.query(`
    UPDATE finance_bank_statements s SET
      line_count = COALESCE(x.line_count, 0),
      income_count = COALESCE(x.income_count, 0),
      expense_count = COALESCE(x.expense_count, 0),
      sridhar_count = COALESCE(x.sridhar_count, 0),
      total_credits = COALESCE(x.credits, 0),
      total_debits = COALESCE(x.debits, 0),
      updated_at = NOW()
    FROM (
      SELECT statement_id,
             COUNT(*) FILTER (WHERE status='posted') AS line_count,
             COUNT(*) FILTER (WHERE status='posted' AND source_module='income') AS income_count,
             COUNT(*) FILTER (WHERE status='posted' AND source_module='expense') AS expense_count,
             COUNT(*) FILTER (WHERE status='posted' AND source_module='sridhar') AS sridhar_count,
             COALESCE(SUM(amount) FILTER (WHERE status='posted' AND direction='credit'),0) AS credits,
             COALESCE(SUM(amount) FILTER (WHERE status='posted' AND direction='debit'),0) AS debits
      FROM finance_bank_statement_lines
      GROUP BY statement_id
    ) x
    WHERE s.id = x.statement_id AND s.status <> 'cancelled'
  `);

  const remain = await client.query(`
    SELECT COUNT(*)::int AS groups FROM (
      SELECT 1 FROM finance_bank_statement_lines
      WHERE status = 'posted'
      GROUP BY txn_date, direction, amount, lower(btrim(description)), lower(btrim(COALESCE(reference,'')))
      HAVING COUNT(*) > 1
    ) t
  `);
  const sridharRemain = await client.query(`
    SELECT COUNT(*)::int AS groups FROM (
      SELECT 1 FROM finance_sridhar_funding
      WHERE status='active'
      GROUP BY txn_date, direction, amount, description, COALESCE(reference,'')
      HAVING COUNT(*) > 1
    ) t
  `);

  await client.query('COMMIT');
  console.log(
    JSON.stringify(
      {
        removedLines,
        cancelledIncome,
        cancelledExpense,
        cancelledSridhar,
        reversedTxn,
        rehashed,
        cancelledEmptyStatements: emptyStmts.length,
        remainingBankDupGroups: remain.rows[0].groups,
        remainingSridharDupGroups: sridharRemain.rows[0].groups,
      },
      null,
      2
    )
  );
} catch (err) {
  await client.query('ROLLBACK');
  console.error(err);
  process.exitCode = 1;
} finally {
  await client.end();
}
