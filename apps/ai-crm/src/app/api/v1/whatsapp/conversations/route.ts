import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { ok, unauthorized } from '@/lib/http';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  const q = new URL(req.url).searchParams.get('q') || '';
  const params: unknown[] = [session.workspaceId];
  let where = 'c.workspace_id=$1';
  if (q) {
    params.push(`%${q}%`);
    where += ` AND (l.full_name ILIKE $${params.length} OR l.phone ILIKE $${params.length} OR l.email ILIKE $${params.length})`;
  }
  const { rows } = await query(
    `SELECT c.*, l.full_name, l.phone, l.email, l.qualification_status, l.lead_score, ps.code AS stage_code
     FROM crm.conversations c
     JOIN crm.leads l ON l.id=c.lead_id
     LEFT JOIN crm.pipeline_stages ps ON ps.id=l.pipeline_stage_id
     WHERE ${where}
     ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
     LIMIT 100`,
    params,
  );
  return ok(rows);
}
