import { getSession, hasMinRole } from '@/lib/auth';
import { eraseLead } from '@/lib/retention';
import { forbidden, notFound, ok, unauthorized } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'business_admin')) return forbidden();
  const { id } = await ctx.params;
  const result = await eraseLead(session.workspaceId, id, session.id);
  if (!result) return notFound('Lead not found');
  return ok(result);
}
