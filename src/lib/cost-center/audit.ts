import { q, type DbClient } from '@/lib/finance/db';

export async function writeCostCenterAudit(
  client: DbClient | undefined,
  input: {
    userId?: string | null;
    entityType: string;
    entityId?: string | null;
    estimateId?: string | null;
    action: string;
    previous?: unknown;
    next?: unknown;
  }
) {
  await q(
    client,
    `INSERT INTO cost_center_audit_logs
      (entity_type, entity_id, estimate_id, action, previous_values, new_values, user_id)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7)`,
    [
      input.entityType,
      input.entityId || null,
      input.estimateId || null,
      input.action,
      input.previous ? JSON.stringify(input.previous) : null,
      input.next ? JSON.stringify(input.next) : null,
      input.userId || null,
    ]
  );
}

export async function listCostCenterAudit(params?: { estimateId?: string; limit?: number }) {
  const { rows } = await q(
    undefined,
    `SELECT a.*, u.email AS user_email
     FROM cost_center_audit_logs a
     LEFT JOIN admin_users u ON u.user_id = a.user_id
     WHERE ($1::uuid IS NULL OR a.estimate_id = $1)
     ORDER BY a.created_at DESC
     LIMIT $2`,
    [params?.estimateId || null, params?.limit || 100]
  );
  return rows;
}
