import { getSession, hasMinRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { fail, forbidden, notFound, ok, unauthorized } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'sales_agent')) return forbidden();
  const { id } = await ctx.params;
  const body = await req.json();
  const fields: string[] = [];
  const params: unknown[] = [session.workspaceId, id];
  for (const [key, col] of [
    ['status', 'status'],
    ['priority', 'priority'],
    ['title', 'title'],
    ['dueAt', 'due_at'],
    ['assignedUserId', 'assigned_user_id'],
  ] as const) {
    if (key in body) {
      params.push(body[key]);
      fields.push(`${col}=$${params.length}`);
    }
  }
  if (!fields.length) return fail('No changes');
  const { rows } = await query(
    `UPDATE crm.tasks SET ${fields.join(', ')} WHERE workspace_id=$1 AND id=$2 RETURNING *`,
    params,
  );
  if (!rows[0]) return notFound();
  return ok({ task: rows[0] });
}
