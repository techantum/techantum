import { getSession, hasMinRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { created, fail, forbidden, ok, unauthorized } from '@/lib/http';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  const status = new URL(req.url).searchParams.get('status');
  const params: unknown[] = [session.workspaceId];
  let where = 't.workspace_id=$1';
  if (status) {
    params.push(status);
    where += ` AND t.status=$${params.length}`;
  }
  const { rows } = await query(
    `SELECT t.*, l.full_name AS lead_name, u.full_name AS assignee_name
     FROM crm.tasks t
     LEFT JOIN crm.leads l ON l.id=t.lead_id
     LEFT JOIN crm.users u ON u.id=t.assigned_user_id
     WHERE ${where}
     ORDER BY COALESCE(t.due_at, t.created_at) ASC
     LIMIT 200`,
    params,
  );
  return ok(rows);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'sales_agent')) return forbidden();
  try {
    const body = await req.json();
    if (!body.title) return fail('title required');
    const { rows } = await query(
      `INSERT INTO crm.tasks (workspace_id, lead_id, assigned_user_id, title, priority, status, due_at)
       VALUES ($1,$2,$3,$4,$5,'open',$6) RETURNING *`,
      [
        session.workspaceId,
        body.leadId || null,
        body.assignedUserId || session.id,
        body.title,
        body.priority || 'medium',
        body.dueAt || null,
      ],
    );
    return created({ task: rows[0] });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Create failed', 500);
  }
}
