import { getSession, hasMinRole } from '@/lib/auth';
import { deleteLead, getLead, listActivities, updateLead } from '@/lib/leads';
import { fail, forbidden, notFound, ok, unauthorized } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;
  const lead = await getLead(session.workspaceId, id);
  if (!lead) return notFound('Lead not found');
  const activities = await listActivities(session.workspaceId, id);
  return ok({ lead, activities });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'sales_agent')) return forbidden();
  const { id } = await ctx.params;
  try {
    const body = await req.json();
    const lead = await updateLead(session.workspaceId, id, body, session.id);
    if (!lead) return notFound('Lead not found');
    return ok({ lead });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Update failed', 500);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'sales_manager')) return forbidden();
  const { id } = await ctx.params;
  const deleted = await deleteLead(session.workspaceId, id, session.id);
  if (!deleted) return notFound('Lead not found');
  return ok({ deleted: true });
}
