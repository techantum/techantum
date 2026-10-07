import { q } from './db';
import { FinanceNotFoundError, FinanceValidationError } from './errors';
import { toCents } from './money';

export async function listVendors(params: { q?: string; status?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 25));
  const where: string[] = [];
  const values: unknown[] = [];
  if (params.status) {
    values.push(params.status);
    where.push(`status = $${values.length}`);
  }
  if (params.q) {
    values.push(`%${params.q}%`);
    where.push(`(vendor_name ILIKE $${values.length} OR gstin ILIKE $${values.length} OR email ILIKE $${values.length})`);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await q(
    undefined,
    `SELECT v.*,
            COALESCE(s.bills,0)::int AS total_bills,
            COALESCE(s.expense,0)::text AS total_expense,
            COALESCE(s.paid,0)::text AS paid_amount,
            COALESCE(s.outstanding,0)::text AS outstanding_amount
     FROM finance_vendors v
     LEFT JOIN (
       SELECT vendor_id,
              COUNT(*) FILTER (WHERE status <> 'cancelled') AS bills,
              SUM(total_amount) FILTER (WHERE status <> 'cancelled') AS expense,
              SUM(amount_paid) FILTER (WHERE status <> 'cancelled') AS paid,
              SUM(balance_amount) FILTER (WHERE status <> 'cancelled') AS outstanding
       FROM finance_expenses
       GROUP BY vendor_id
     ) s ON s.vendor_id = v.id
     ${clause}
     ORDER BY v.vendor_name
     LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    values
  );
  const count = await q<{ count: string }>(undefined, `SELECT COUNT(*)::text AS count FROM finance_vendors ${clause}`, values);
  return { rows, total: Number(count.rows[0]?.count || 0), page, pageSize };
}

export async function getVendor(id: string) {
  const { rows } = await q(undefined, 'SELECT * FROM finance_vendors WHERE id = $1', [id]);
  if (!rows[0]) throw new FinanceNotFoundError('Vendor not found');
  const bills = await q(
    undefined,
    `SELECT * FROM finance_expenses WHERE vendor_id = $1 ORDER BY expense_date DESC`,
    [id]
  );
  const payments = await q(
    undefined,
    `SELECT p.*, e.description, e.vendor_invoice_number
     FROM finance_expense_payments p
     JOIN finance_expenses e ON e.id = p.expense_id
     WHERE e.vendor_id = $1
     ORDER BY p.payment_date DESC`,
    [id]
  );
  const totals = bills.rows
    .filter((r) => r.status !== 'cancelled')
    .reduce(
      (acc, r) => ({
        bills: acc.bills + 1,
        expense: acc.expense + toCents(r.total_amount),
        paid: acc.paid + toCents(r.amount_paid),
        outstanding: acc.outstanding + toCents(r.balance_amount),
      }),
      { bills: 0, expense: 0, paid: 0, outstanding: 0 }
    );
  return { vendor: rows[0], totals, expenses: bills.rows, payments: payments.rows };
}

export async function upsertVendor(body: Record<string, unknown>, userId: string, id?: string) {
  const name = String(body.vendor_name || '').trim();
  if (!name) throw new FinanceValidationError('Vendor name is required');
  const fields = [
    name,
    body.contact_person || null,
    body.email || null,
    body.phone || null,
    body.address || null,
    body.city || null,
    body.state || null,
    body.state_code || null,
    body.gstin || null,
    body.pan || null,
    body.payment_details || null,
    body.default_expense_category_id || null,
    body.status || 'active',
    body.notes || null,
    userId,
  ];
  if (id) {
    const { rows } = await q(
      undefined,
      `UPDATE finance_vendors SET
         vendor_name=$1, contact_person=$2, email=$3, phone=$4, address=$5, city=$6, state=$7, state_code=$8,
         gstin=$9, pan=$10, payment_details=$11, default_expense_category_id=$12, status=$13, notes=$14, updated_by=$15
       WHERE id=$16 RETURNING *`,
      [...fields, id]
    );
    if (!rows[0]) throw new FinanceNotFoundError('Vendor not found');
    return rows[0];
  }
  const { rows } = await q(
    undefined,
    `INSERT INTO finance_vendors (
       vendor_name, contact_person, email, phone, address, city, state, state_code, gstin, pan, payment_details,
       default_expense_category_id, status, notes, created_by, updated_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$15) RETURNING *`,
    fields
  );
  return rows[0];
}
