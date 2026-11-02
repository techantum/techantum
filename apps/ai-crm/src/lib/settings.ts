import { query } from './db';

export async function getWorkspaceSettings(workspaceId: string) {
  const { rows } = await query(`SELECT * FROM crm.workspace_settings WHERE workspace_id=$1`, [workspaceId]);
  if (rows[0]) return rows[0];
  const { rows: created } = await query(
    `INSERT INTO crm.workspace_settings (workspace_id)
     VALUES ($1)
     ON CONFLICT (workspace_id) DO UPDATE SET updated_at=NOW()
     RETURNING *`,
    [workspaceId],
  );
  return created[0];
}

export async function updateWorkspaceSettings(workspaceId: string, patch: Record<string, unknown>) {
  const current = await getWorkspaceSettings(workspaceId);
  const next = {
    business_name: patch.businessName ?? current.business_name,
    timezone: patch.timezone ?? current.timezone,
    currency: patch.currency ?? current.currency,
    calling_policy: patch.callingPolicy ?? current.calling_policy,
    qualification_rules: patch.qualificationRules ?? current.qualification_rules,
    notification_settings: patch.notificationSettings ?? current.notification_settings,
    retention_policy: patch.retentionPolicy ?? current.retention_policy,
    ops_profile: patch.opsProfile ?? current.ops_profile,
  };
  const { rows } = await query(
    `UPDATE crm.workspace_settings SET
      business_name=$2,
      timezone=$3,
      currency=$4,
      calling_policy=$5::jsonb,
      qualification_rules=$6::jsonb,
      notification_settings=$7::jsonb,
      retention_policy=COALESCE($8::jsonb, retention_policy),
      ops_profile=COALESCE($9::jsonb, ops_profile),
      updated_at=NOW()
     WHERE workspace_id=$1
     RETURNING *`,
    [
      workspaceId,
      next.business_name,
      next.timezone,
      next.currency,
      JSON.stringify(next.calling_policy),
      JSON.stringify(next.qualification_rules),
      JSON.stringify(next.notification_settings),
      next.retention_policy ? JSON.stringify(next.retention_policy) : null,
      next.ops_profile ? JSON.stringify(next.ops_profile) : null,
    ],
  );
  return rows[0];
}

export async function getWorkspace(workspaceId: string) {
  const { rows } = await query(`SELECT * FROM crm.workspaces WHERE id=$1`, [workspaceId]);
  return rows[0] || null;
}
