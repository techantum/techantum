import type { DbClient } from './db';
import { q } from './db';

export async function writeFinanceAudit(
  client: DbClient | undefined,
  input: {
    userId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    previous?: unknown;
    next?: unknown;
    ip?: string | null;
    userAgent?: string | null;
  }
) {
  await q(
    client,
    `INSERT INTO finance_audit_logs (user_id, action, entity_type, entity_id, previous_values, new_values, ip, user_agent)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8)`,
    [
      input.userId || null,
      input.action,
      input.entityType,
      input.entityId || null,
      input.previous ? JSON.stringify(input.previous) : null,
      input.next ? JSON.stringify(input.next) : null,
      input.ip || null,
      input.userAgent || null,
    ]
  );
}

export async function listAuditLogs(params: { entityType?: string; entityId?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 25));
  const where: string[] = [];
  const values: unknown[] = [];
  if (params.entityType) {
    values.push(params.entityType);
    where.push(`entity_type = $${values.length}`);
  }
  if (params.entityId) {
    values.push(params.entityId);
    where.push(`entity_id = $${values.length}`);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await q(
    undefined,
    `SELECT * FROM finance_audit_logs ${clause} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    values
  );
  const count = await q<{ count: string }>(undefined, `SELECT COUNT(*)::text AS count FROM finance_audit_logs ${clause}`, values);
  return { rows, total: Number(count.rows[0]?.count || 0), page, pageSize };
}
