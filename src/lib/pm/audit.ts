import { q, type DbClient } from '@/lib/finance/db';

export async function writePmAudit(
  client: DbClient | undefined,
  input: {
    userId?: string | null;
    entityType: string;
    entityId?: string | null;
    projectId?: string | null;
    action: string;
    previous?: unknown;
    next?: unknown;
    changedFields?: string[];
  }
) {
  await q(
    client,
    `INSERT INTO project_management_audit_logs
      (entity_type, entity_id, action, changed_fields, previous_values, new_values, user_id, project_id)
     VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7,$8)`,
    [
      input.entityType,
      input.entityId || null,
      input.action,
      JSON.stringify(input.changedFields || []),
      input.previous ? JSON.stringify(input.previous) : null,
      input.next ? JSON.stringify(input.next) : null,
      input.userId || null,
      input.projectId || null,
    ]
  );
}
