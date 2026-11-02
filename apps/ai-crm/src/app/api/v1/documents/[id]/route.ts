import { getSession, hasMinRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { fail, forbidden, notFound, ok, unauthorized } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'document_reviewer')) return forbidden();
  const { id } = await ctx.params;
  const body = await req.json();
  const { rows } = await query(
    `UPDATE crm.documents SET
      status=COALESCE($3, status),
      review_notes=COALESCE($4, review_notes)
     WHERE workspace_id=$1 AND id=$2
     RETURNING *`,
    [session.workspaceId, id, body.status || null, body.reviewNotes || null],
  );
  if (!rows[0]) return notFound();
  return ok({ document: rows[0] });
}
