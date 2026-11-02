import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { ok, unauthorized } from '@/lib/http';

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  const stages = await query(
    `SELECT * FROM crm.pipeline_stages WHERE workspace_id=$1 ORDER BY sort_order ASC`,
    [session.workspaceId],
  );
  const leads = await query(
    `SELECT l.id, l.full_name, l.phone, l.email, l.lead_score, l.qualification_status, l.pipeline_stage_id, ps.code AS stage_code
     FROM crm.leads l
     LEFT JOIN crm.pipeline_stages ps ON ps.id=l.pipeline_stage_id
     WHERE l.workspace_id=$1
     ORDER BY l.updated_at DESC
     LIMIT 500`,
    [session.workspaceId],
  );
  return ok({ stages: stages.rows, leads: leads.rows });
}
