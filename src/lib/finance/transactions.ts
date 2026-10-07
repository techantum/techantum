import { q } from './db';

export async function listTransactions(params: {
  q?: string;
  from?: string;
  to?: string;
  type?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, params.pageSize ? Math.max(1, params.pageSize) : 25);
  const where: string[] = [];
  const values: unknown[] = [];
  if (params.from) {
    values.push(params.from);
    where.push(`t.transaction_date >= $${values.length}`);
  }
  if (params.to) {
    values.push(params.to);
    where.push(`t.transaction_date <= $${values.length}`);
  }
  if (params.type) {
    values.push(params.type);
    where.push(`t.transaction_type = $${values.length}`);
  }
  if (params.q) {
    values.push(`%${params.q}%`);
    where.push(
      `(t.description ILIKE $${values.length} OR t.transaction_reference ILIKE $${values.length} OR c.name ILIKE $${values.length} OR v.vendor_name ILIKE $${values.length})`
    );
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await q(
    undefined,
    `SELECT t.*,
            CASE
              WHEN t.party_type = 'client' THEN c.name
              WHEN t.party_type = 'vendor' THEN v.vendor_name
              ELSE NULL
            END AS party_name
     FROM finance_transactions t
     LEFT JOIN ops_clients c ON t.party_type = 'client' AND c.id = t.party_id
     LEFT JOIN finance_vendors v ON t.party_type = 'vendor' AND v.id = t.party_id
     ${clause}
     ORDER BY t.transaction_date DESC, t.created_at DESC
     LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    values
  );
  const count = await q<{ count: string }>(
    undefined,
    `SELECT COUNT(*)::text AS count
     FROM finance_transactions t
     LEFT JOIN ops_clients c ON t.party_type = 'client' AND c.id = t.party_id
     LEFT JOIN finance_vendors v ON t.party_type = 'vendor' AND v.id = t.party_id
     ${clause}`,
    values
  );
  return { rows, total: Number(count.rows[0]?.count || 0), page, pageSize };
}
