import { q, withFinanceTx } from './db';
import { FinanceConflictError, FinanceValidationError } from './errors';
import { assertISODate } from './fy';
import { fromCents, toCents } from './money';
import { categoryIdByCode } from './lookups';
import { registerDocument } from './documents';
import { saveFinanceFile } from './storage';

export async function listSalaries(params: { year?: number; month?: number; page?: number; pageSize?: number }) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 25));
  const where: string[] = [];
  const values: unknown[] = [];
  if (params.year) {
    values.push(params.year);
    where.push(`year = $${values.length}`);
  }
  if (params.month) {
    values.push(params.month);
    where.push(`month = $${values.length}`);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await q(
    undefined,
    `SELECT s.*, e.payment_status, e.amount_paid, e.balance_amount
     FROM finance_salary_entries s
     LEFT JOIN finance_expenses e ON e.id = s.expense_id
     ${clause}
     ORDER BY s.year DESC, s.month DESC, s.created_at DESC
     LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    values
  );
  const count = await q<{ count: string }>(undefined, `SELECT COUNT(*)::text AS count FROM finance_salary_entries ${clause}`, values);
  return { rows, total: Number(count.rows[0]?.count || 0), page, pageSize };
}

/** Call when HR/payroll marks a run as paid. payroll_id is the unique linkage. */
export async function syncSalaryFromPayroll(
  input: {
    payroll_id: string;
    employee_id?: string | null;
    employee_name: string;
    month: number;
    year: number;
    gross_salary: unknown;
    deductions?: unknown;
    lop?: unknown;
    net_salary: unknown;
    payment_date: string;
    payment_mode?: string | null;
    transaction_reference?: string | null;
  },
  userId: string
) {
  const payrollId = String(input.payroll_id || '').trim();
  if (!payrollId) throw new FinanceValidationError('payroll_id is required');
  const existing = await q(undefined, 'SELECT * FROM finance_salary_entries WHERE payroll_id = $1', [payrollId]);
  if (existing.rows[0]) return existing.rows[0];
  return createSalaryEntry({ ...input, payroll_id: payrollId }, userId);
}

export async function createSalaryEntry(body: Record<string, unknown>, userId: string) {
  const name = String(body.employee_name || '').trim();
  if (!name) throw new FinanceValidationError('Employee name is required');
  const month = Number(body.month);
  const year = Number(body.year);
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new FinanceValidationError('Month is invalid');
  if (!Number.isInteger(year) || year < 2000) throw new FinanceValidationError('Year is invalid');
  const net = toCents(body.net_salary);
  const gross = toCents(body.gross_salary ?? net);
  if (net < 0 || gross < 0) throw new FinanceValidationError('Salary amounts cannot be negative');
  const paymentDate = body.payment_date ? assertISODate(String(body.payment_date), 'Payment date') : null;
  const payrollId = String(body.payroll_id || '').trim() || null;
  const salaryCategory = await categoryIdByCode('finance_expense_categories', 'employee_salaries');

  try {
    return await withFinanceTx(async (db) => {
      if (payrollId) {
        const dupe = await q(db, 'SELECT id FROM finance_salary_entries WHERE payroll_id = $1', [payrollId]);
        if (dupe.rows[0]) throw new FinanceConflictError('A finance expense already exists for this payroll_id');
      }
      const { rows: salaryRows } = await q(
        db,
        `INSERT INTO finance_salary_entries (
           payroll_id, employee_id, employee_name, month, year, gross_salary, deductions, lop, net_salary,
           payment_date, payment_mode, transaction_reference, status, created_by, updated_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'recorded',$13,$13) RETURNING *`,
        [
          payrollId,
          body.employee_id || null,
          name,
          month,
          year,
          fromCents(gross),
          fromCents(toCents(body.deductions)),
          fromCents(toCents(body.lop)),
          fromCents(net),
          paymentDate,
          body.payment_mode || null,
          body.transaction_reference || null,
          userId,
        ]
      );
      const salary = salaryRows[0];
      const { rows: expRows } = await q(
        db,
        `INSERT INTO finance_expenses (
           expense_date, category_id, description, taxable_amount, total_amount, amount_paid, balance_amount,
           payment_status, notes, status, salary_entry_id, created_by, updated_by
         ) VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,'recorded',$9,$10,$10) RETURNING *`,
        [
          paymentDate || `${year}-${String(month).padStart(2, '0')}-01`,
          salaryCategory || null,
          `Salary — ${name} (${String(month).padStart(2, '0')}/${year})`,
          fromCents(net),
          paymentDate ? fromCents(net) : fromCents(0),
          paymentDate ? fromCents(0) : fromCents(net),
          paymentDate ? 'paid' : 'unpaid',
          payrollId ? `payroll_id=${payrollId}` : null,
          salary.id,
          userId,
        ]
      );
      await q(db, 'UPDATE finance_salary_entries SET expense_id=$2 WHERE id=$1', [salary.id, expRows[0].id]);
      if (paymentDate && net > 0) {
        const { rows: payRows } = await q(
          db,
          `INSERT INTO finance_expense_payments (
             expense_id, payment_date, amount_paid, payment_mode, transaction_reference, notes, status,
             payment_recorded_by, created_by, updated_by
           ) VALUES ($1,$2,$3,$4,$5,$6,'active',$7,$7,$7) RETURNING *`,
          [
            expRows[0].id,
            paymentDate,
            fromCents(net),
            body.payment_mode || null,
            body.transaction_reference || null,
            `Salary payment ${name}`,
            userId,
          ]
        );
        await q(
          db,
          `INSERT INTO finance_transactions (
             transaction_date, transaction_type, reference_type, reference_id, party_type, category_id,
             description, money_in, money_out, payment_mode, transaction_reference, status, created_by
           ) VALUES ($1,'salary_payment','expense_payment',$2,'employee',$3,$4,0,$5,$6,$7,'active',$8)`,
          [
            paymentDate,
            payRows[0].id,
            salaryCategory || null,
            `Salary — ${name}`,
            fromCents(net),
            body.payment_mode || null,
            body.transaction_reference || null,
            userId,
          ]
        );
      }
      return { ...salary, expense_id: expRows[0].id };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (/finance_salary_entries_payroll_id/i.test(message) || /duplicate key/i.test(message)) {
      throw new FinanceConflictError('A finance expense already exists for this payroll_id');
    }
    throw err;
  }
}

export async function attachPayslip(salaryId: string, file: File, userId: string) {
  const stored = await saveFinanceFile(file, 'salaries');
  await q(undefined, 'UPDATE finance_salary_entries SET payslip_path=$2 WHERE id=$1', [salaryId, stored.storage_path]);
  const { rows } = await q(undefined, 'SELECT year, month FROM finance_salary_entries WHERE id=$1', [salaryId]);
  await registerDocument(undefined, {
    documentType: 'salary_document',
    referenceType: 'salary',
    referenceId: salaryId,
    documentDate: rows[0] ? `${rows[0].year}-${String(rows[0].month).padStart(2, '0')}-01` : null,
    originalFilename: stored.original_filename,
    storedFilename: stored.stored_filename,
    storagePath: stored.storage_path,
    mimeType: stored.mime_type,
    fileSize: stored.file_size,
    notes: 'Payslip',
    userId,
  });
  return stored;
}
