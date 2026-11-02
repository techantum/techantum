import { getSession, hasMinRole } from '@/lib/auth';
import { listKnowledge, listTestMessages, updateAgent } from '@/lib/agents';
import { fail, forbidden, notFound, ok, unauthorized } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;
  const agent = await updateAgent(session.workspaceId, id, {});
  if (!agent) return notFound();
  const [knowledge, messages] = await Promise.all([
    listKnowledge(session.workspaceId, id),
    listTestMessages(session.workspaceId, id),
  ]);
  return ok({ agent, knowledge, messages });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'business_admin')) return forbidden();
  const { id } = await ctx.params;
  try {
    const body = await req.json();
    const agent = await updateAgent(session.workspaceId, id, body);
    if (!agent) return notFound();
    return ok({ agent });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Update failed', 500);
  }
}
