import { getSession, hasMinRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { fail, forbidden, notFound, ok, unauthorized } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;
  const conv = (
    await query(
      `SELECT c.*, l.full_name, l.phone, l.email FROM crm.conversations c
       JOIN crm.leads l ON l.id=c.lead_id
       WHERE c.workspace_id=$1 AND c.id=$2`,
      [session.workspaceId, id],
    )
  ).rows[0];
  if (!conv) return notFound();
  const messages = await query(
    `SELECT * FROM crm.messages WHERE conversation_id=$1 ORDER BY created_at ASC`,
    [id],
  );
  return ok({ conversation: conv, messages: messages.rows });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'sales_agent')) return forbidden();
  const { id } = await ctx.params;
  const body = await req.json();
  const fields: string[] = [];
  const params: unknown[] = [session.workspaceId, id];
  if (body.mode) {
    params.push(body.mode);
    fields.push(`mode=$${params.length}`);
  }
  if (body.status) {
    params.push(body.status);
    fields.push(`status=$${params.length}`);
  }
  if (!fields.length) return fail('No changes');
  const { rows } = await query(
    `UPDATE crm.conversations SET ${fields.join(', ')} WHERE workspace_id=$1 AND id=$2 RETURNING *`,
    params,
  );
  if (!rows[0]) return notFound();
  return ok({ conversation: rows[0] });
}
