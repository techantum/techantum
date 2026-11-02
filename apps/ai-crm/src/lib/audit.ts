import { query } from './db';

export async function writeAudit(input: {
  workspaceId?: string | null;
  actorUserId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  previousValue?: unknown;
  newValue?: unknown;
  ip?: string | null;
}) {
  await query(
    `INSERT INTO crm.audit_logs
      (workspace_id, actor_user_id, action, target_type, target_id, previous_value, new_value, ip)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8)`,
    [
      input.workspaceId || null,
      input.actorUserId || null,
      input.action,
      input.targetType || null,
      input.targetId || null,
      JSON.stringify(input.previousValue ?? null),
      JSON.stringify(input.newValue ?? null),
      input.ip || null,
    ],
  );
}
