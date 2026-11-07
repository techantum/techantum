import { q, type DbClient } from './db';
import { fromCents, toCents } from './money';

const DATE_WINDOW_DAYS = 14;

export type PartyMatch = {
  partyType: 'client' | 'vendor' | 'employee';
  partyId: string;
  partyName: string;
};

export type ServiceMatch = { serviceId: string; serviceName: string };

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameTokens(value: string) {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length >= 3 && !['pvt', 'ltd', 'limited', 'private', 'and', 'the', 'for', 'from', 'neft', 'imps', 'upi', 'rtgs', 'bank'].includes(token));
}

export function buildReconcileKey(parts: {
  partyId?: string | null;
  amount: number;
  serviceId?: string | null;
  direction: string;
  txnDate: string;
}) {
  return [
    parts.direction,
    parts.partyId || '',
    toCents(parts.amount),
    parts.serviceId || '',
    parts.txnDate,
  ].join('|');
}

export async function loadPartyCatalog(db?: DbClient) {
  const [clients, vendors, services] = await Promise.all([
    q<{ id: string; name: string }>(
      db,
      `SELECT id, name FROM ops_clients WHERE status IS DISTINCT FROM 'inactive' ORDER BY length(name) DESC`
    ),
    q<{ id: string; vendor_name: string }>(
      db,
      `SELECT id, vendor_name FROM finance_vendors
       WHERE status IS DISTINCT FROM 'inactive' AND vendor_name IS DISTINCT FROM 'General / Other'
       ORDER BY length(vendor_name) DESC`
    ),
    q<{ id: string; service_name: string }>(
      db,
      `SELECT id, service_name FROM finance_services WHERE active IS DISTINCT FROM FALSE ORDER BY length(service_name) DESC`
    ),
  ]);
  return {
    clients: clients.rows.map((row) => ({ id: row.id, name: row.name, tokens: nameTokens(row.name) })),
    vendors: vendors.rows.map((row) => ({ id: row.id, name: row.vendor_name, tokens: nameTokens(row.vendor_name) })),
    services: services.rows.map((row) => ({ id: row.id, name: row.service_name, tokens: nameTokens(row.service_name) })),
  };
}

function scoreNameMatch(haystack: string, name: string, tokens: string[]) {
  const hay = normalizeText(haystack);
  const full = normalizeText(name);
  if (!hay || !full) return 0;
  if (hay.includes(full)) return 1;
  if (tokens.length < 1) return 0;
  const hits = tokens.filter((token) => hay.includes(token)).length;
  if (tokens.length === 1) return hits === 1 && tokens[0].length >= 5 ? 0.85 : 0;
  const score = hits / tokens.length;
  return hits >= 2 && score >= 0.6 ? score : 0;
}

export function matchPartyFromNarration(
  description: string,
  direction: 'credit' | 'debit',
  catalog: Awaited<ReturnType<typeof loadPartyCatalog>>,
  employeeName?: string | null
): PartyMatch | null {
  if (employeeName) {
    return { partyType: 'employee', partyId: '', partyName: employeeName };
  }
  let best: { match: PartyMatch; score: number } | null = null;
  const pool =
    direction === 'credit'
      ? catalog.clients.map((c) => ({ ...c, partyType: 'client' as const }))
      : [
          ...catalog.vendors.map((v) => ({ ...v, partyType: 'vendor' as const })),
          ...catalog.clients.map((c) => ({ ...c, partyType: 'client' as const })),
        ];
  for (const item of pool) {
    const score = scoreNameMatch(description, item.name, item.tokens);
    if (score > 0 && (!best || score > best.score)) {
      best = {
        score,
        match: { partyType: item.partyType, partyId: item.id, partyName: item.name },
      };
    }
  }
  return best && best.score >= 0.6 ? best.match : null;
}

export function matchServiceFromNarration(
  description: string,
  catalog: Awaited<ReturnType<typeof loadPartyCatalog>>
): ServiceMatch | null {
  let best: { match: ServiceMatch; score: number } | null = null;
  for (const service of catalog.services) {
    const score = scoreNameMatch(description, service.name, service.tokens);
    if (score > 0 && (!best || score > best.score)) {
      best = { score, match: { serviceId: service.id, serviceName: service.name } };
    }
  }
  return best && best.score >= 0.6 ? best.match : null;
}

/** Find an existing invoice payment that matches this bank credit (same client/amount/service window). */
export async function findMatchingInvoicePayment(
  db: DbClient,
  opts: {
    amount: number;
    txnDate: string;
    partyId?: string | null;
    serviceId?: string | null;
    reference?: string | null;
    description?: string;
  }
) {
  const amount = fromCents(toCents(opts.amount));
  const values: unknown[] = [amount, opts.txnDate, DATE_WINDOW_DAYS];
  const where = [
    `p.status = 'active'`,
    `p.bank_statement_line_id IS NULL`,
    `p.amount_received = $1`,
    `ABS(p.payment_date - $2::date) <= $3`,
  ];
  if (opts.partyId) {
    values.push(opts.partyId);
    where.push(`p.client_id = $${values.length}`);
  }
  if (opts.reference) {
    values.push(opts.reference);
    where.push(`(COALESCE(p.transaction_reference,'') = '' OR p.transaction_reference = $${values.length})`);
  }
  if (opts.serviceId) {
    values.push(opts.serviceId);
    where.push(`EXISTS (
      SELECT 1 FROM finance_invoice_items ii
      WHERE ii.invoice_id = p.invoice_id AND ii.service_id = $${values.length}
    )`);
  }
  const { rows } = await q<{
    id: string;
    invoice_id: string;
    client_id: string;
    client_name: string;
    amount_received: string;
    payment_date: string;
    service_id: string | null;
  }>(
    db,
    `SELECT p.id, p.invoice_id, p.client_id, c.name AS client_name, p.amount_received::text, p.payment_date::text,
            (
              SELECT ii.service_id::text FROM finance_invoice_items ii
              WHERE ii.invoice_id = p.invoice_id
              ORDER BY ii.line_no ASC NULLS LAST
              LIMIT 1
            ) AS service_id
     FROM finance_invoice_payments p
     LEFT JOIN ops_clients c ON c.id = p.client_id
     WHERE ${where.join(' AND ')}
     ORDER BY ABS(p.payment_date - $2::date) ASC, p.created_at DESC
     LIMIT 1`,
    values
  );
  if (rows[0]) return rows[0];

  // Fallback: outstanding finalized invoice with same client + amount + service (payment not yet recorded)
  if (!opts.partyId) return null;
  const invoiceValues: unknown[] = [opts.partyId, amount, opts.txnDate, DATE_WINDOW_DAYS];
  let serviceClause = '';
  if (opts.serviceId) {
    invoiceValues.push(opts.serviceId);
    serviceClause = `AND EXISTS (SELECT 1 FROM finance_invoice_items ii WHERE ii.invoice_id = i.id AND ii.service_id = $${invoiceValues.length})`;
  }
  const invoices = await q<{ id: string; client_id: string; client_name: string; total_amount: string; service_id: string | null }>(
    db,
    `SELECT i.id, i.client_id, c.name AS client_name, i.total_amount::text,
            (
              SELECT ii.service_id::text FROM finance_invoice_items ii
              WHERE ii.invoice_id = i.id ORDER BY ii.line_no ASC NULLS LAST LIMIT 1
            ) AS service_id
     FROM finance_invoices i
     LEFT JOIN ops_clients c ON c.id = i.client_id
     WHERE i.client_id = $1
       AND i.invoice_status IN ('finalized','sent')
       AND i.outstanding_amount > 0
       AND ABS(i.total_amount - $2) < 0.01
       AND ABS(COALESCE(i.due_date, i.invoice_date) - $3::date) <= $4
       ${serviceClause}
     ORDER BY ABS(COALESCE(i.due_date, i.invoice_date) - $3::date) ASC
     LIMIT 1`,
    invoiceValues
  );
  if (!invoices.rows[0]) return null;
  return {
    id: null as string | null,
    invoice_id: invoices.rows[0].id,
    client_id: invoices.rows[0].client_id,
    client_name: invoices.rows[0].client_name,
    amount_received: amount,
    payment_date: opts.txnDate,
    service_id: invoices.rows[0].service_id,
    pendingInvoiceOnly: true as const,
  };
}

/** Find an existing receipt / bank expense that matches this debit. */
export async function findMatchingReceipt(
  db: DbClient,
  opts: {
    amount: number;
    txnDate: string;
    partyId?: string | null;
    reference?: string | null;
    description?: string;
  }
) {
  const amount = fromCents(toCents(opts.amount));
  const values: unknown[] = [amount, opts.txnDate, DATE_WINDOW_DAYS];
  const where = [
    `e.status = 'recorded'`,
    `e.bank_statement_line_id IS NULL`,
    `e.total_amount = $1`,
    `ABS(e.expense_date - $2::date) <= $3`,
  ];
  if (opts.partyId) {
    values.push(opts.partyId);
    where.push(`(e.vendor_id = $${values.length} OR e.client_id = $${values.length})`);
  }
  if (opts.reference) {
    values.push(opts.reference);
    where.push(`(COALESCE(e.transaction_reference,'') = '' OR e.transaction_reference = $${values.length})`);
  }
  const { rows } = await q<{
    id: string;
    vendor_id: string | null;
    client_id: string | null;
    vendor_name: string | null;
    total_amount: string;
    expense_date: string;
  }>(
    db,
    `SELECT e.id, e.vendor_id, e.client_id, v.vendor_name, e.total_amount::text, e.expense_date::text
     FROM finance_expenses e
     LEFT JOIN finance_vendors v ON v.id = e.vendor_id
     WHERE ${where.join(' AND ')}
     ORDER BY ABS(e.expense_date - $2::date) ASC, e.created_at DESC
     LIMIT 1`,
    values
  );
  return rows[0] || null;
}

/** Existing bank income with same client + amount (+ service) — avoid duplicate ledger rows. */
export async function findDuplicateIncome(
  db: DbClient,
  opts: { clientId?: string | null; amount: number; txnDate: string; serviceId?: string | null; invoiceId?: string | null }
) {
  if (!opts.clientId) return null;
  const amount = fromCents(toCents(opts.amount));
  const values: unknown[] = [opts.clientId, amount, opts.txnDate, DATE_WINDOW_DAYS];
  const where = [
    `i.status = 'active'`,
    `i.client_id = $1`,
    `i.net_received = $2`,
    `ABS(i.income_date - $3::date) <= $4`,
  ];
  if (opts.invoiceId) {
    values.push(opts.invoiceId);
    where.push(`i.invoice_id = $${values.length}`);
  }
  const { rows } = await q(db, `SELECT i.* FROM finance_income i WHERE ${where.join(' AND ')} LIMIT 1`, values);
  return rows[0] || null;
}

export async function findDuplicateExpense(
  db: DbClient,
  opts: {
    vendorId?: string | null;
    clientId?: string | null;
    amount: number;
    txnDate: string;
    description?: string;
    /** When true (default), only match expenses not yet linked to a bank line. */
    unlinkedOnly?: boolean;
  }
) {
  const amount = fromCents(toCents(opts.amount));
  const values: unknown[] = [amount, opts.txnDate, DATE_WINDOW_DAYS];
  const where = [`e.status = 'recorded'`, `e.total_amount = $1`, `ABS(e.expense_date - $2::date) <= $3`];
  if (opts.unlinkedOnly !== false) {
    where.push(`e.bank_statement_line_id IS NULL`);
  }
  if (opts.vendorId) {
    values.push(opts.vendorId);
    where.push(`e.vendor_id = $${values.length}`);
  } else if (opts.clientId) {
    values.push(opts.clientId);
    where.push(`e.client_id = $${values.length}`);
  } else {
    return null;
  }
  const { rows } = await q(
    db,
    `SELECT e.* FROM finance_expenses e WHERE ${where.join(' AND ')}
     ORDER BY CASE WHEN COALESCE(e.source,'') = 'bank_statement' THEN 0 ELSE 1 END, e.created_at DESC
     LIMIT 1`,
    values
  );
  return rows[0] || null;
}

/** When recording an invoice payment, attach an unmatched bank credit if it matches. */
export async function linkBankLineToInvoicePayment(
  db: DbClient,
  payment: {
    id: string;
    invoice_id: string;
    client_id: string;
    payment_date: string;
    amount_received: string | number;
    transaction_reference?: string | null;
  },
  userId: string
) {
  const amount = fromCents(toCents(payment.amount_received));
  const values: unknown[] = [amount, payment.payment_date, DATE_WINDOW_DAYS, payment.client_id];
  const { rows } = await q<{ id: string; income_id: string | null; transaction_id: string | null }>(
    db,
    `SELECT l.id, l.income_id, l.transaction_id
     FROM finance_bank_statement_lines l
     WHERE l.direction = 'credit'
       AND l.status = 'posted'
       AND l.matched_payment_id IS NULL
       AND l.amount = $1
       AND ABS(l.txn_date - $2::date) <= $3
       AND (l.party_id = $4 OR l.party_id IS NULL)
     ORDER BY
       CASE WHEN l.party_id = $4 THEN 0 ELSE 1 END,
       ABS(l.txn_date - $2::date) ASC
     LIMIT 1`,
    values
  );
  const line = rows[0];
  if (!line) return null;

  await q(
    db,
    `UPDATE finance_bank_statement_lines
     SET matched_payment_id=$2, matched_invoice_id=$3, party_type='client', party_id=$4,
         updated_by=$5, updated_at=NOW()
     WHERE id=$1`,
    [line.id, payment.id, payment.invoice_id, payment.client_id, userId]
  );
  await q(db, `UPDATE finance_invoice_payments SET bank_statement_line_id=$2 WHERE id=$1`, [payment.id, line.id]);

  if (line.income_id) {
    await q(
      db,
      `UPDATE finance_income
       SET client_id=$2, invoice_id=$3, payment_id=$4, updated_by=$5, updated_at=NOW()
       WHERE id=$1 AND payment_id IS NULL`,
      [line.income_id, payment.client_id, payment.invoice_id, payment.id, userId]
    );
  }

  // Avoid double-counting: if bank already posted money_in, reverse that bank_income txn (invoice_payment txn remains).
  if (line.transaction_id) {
    await q(
      db,
      `UPDATE finance_transactions
       SET status='reversed', updated_by=$2, updated_at=NOW()
       WHERE id=$1 AND transaction_type='bank_income' AND status='active'`,
      [line.transaction_id, userId]
    );
  }
  return line.id;
}

/** When recording a receipt payment, attach an unmatched bank debit if it matches. */
export async function linkBankLineToReceiptPayment(
  db: DbClient,
  payment: {
    id: string;
    expense_id: string;
    payment_date: string;
    amount_paid: string | number;
  },
  expense: { vendor_id?: string | null; client_id?: string | null },
  userId: string
) {
  const amount = fromCents(toCents(payment.amount_paid));
  const values: unknown[] = [amount, payment.payment_date, DATE_WINDOW_DAYS];
  let partyClause = '';
  if (expense.vendor_id) {
    values.push(expense.vendor_id);
    partyClause = `AND (l.party_id = $${values.length} OR l.party_id IS NULL)`;
  } else if (expense.client_id) {
    values.push(expense.client_id);
    partyClause = `AND (l.party_id = $${values.length} OR l.party_id IS NULL)`;
  }
  const { rows } = await q<{ id: string; expense_id: string | null; transaction_id: string | null }>(
    db,
    `SELECT l.id, l.expense_id, l.transaction_id
     FROM finance_bank_statement_lines l
     WHERE l.direction = 'debit'
       AND l.status = 'posted'
       AND l.matched_receipt_id IS NULL
       AND l.source_module = 'expense'
       AND l.amount = $1
       AND ABS(l.txn_date - $2::date) <= $3
       ${partyClause}
     ORDER BY ABS(l.txn_date - $2::date) ASC
     LIMIT 1`,
    values
  );
  const line = rows[0];
  if (!line) return null;

  await q(
    db,
    `UPDATE finance_bank_statement_lines
     SET matched_receipt_id=$2, updated_by=$3, updated_at=NOW()
     WHERE id=$1`,
    [line.id, payment.expense_id, userId]
  );
  await q(db, `UPDATE finance_expense_payments SET bank_statement_line_id=$2 WHERE id=$1`, [payment.id, line.id]);
  await q(db, `UPDATE finance_expenses SET bank_statement_line_id=COALESCE(bank_statement_line_id,$2) WHERE id=$1`, [
    payment.expense_id,
    line.id,
  ]);

  if (line.transaction_id && line.expense_id && line.expense_id !== payment.expense_id) {
    // Bank created a separate expense row — keep bank expense linked; reverse bank txn to avoid double money_out with receipt_payment.
    await q(
      db,
      `UPDATE finance_transactions
       SET status='reversed', updated_by=$2, updated_at=NOW()
       WHERE id=$1 AND transaction_type IN ('bank_expense','salary_payment') AND status='active'`,
      [line.transaction_id, userId]
    );
  } else if (line.transaction_id && !line.expense_id) {
    await q(
      db,
      `UPDATE finance_transactions
       SET status='reversed', updated_by=$2, updated_at=NOW()
       WHERE id=$1 AND transaction_type IN ('bank_expense','salary_payment') AND status='active'`,
      [line.transaction_id, userId]
    );
  }
  return line.id;
}
