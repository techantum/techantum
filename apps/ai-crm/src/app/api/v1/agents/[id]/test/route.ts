import { getSession, hasMinRole } from '@/lib/auth';
import { runAgentTest } from '@/lib/agents';
import { fail, forbidden, ok, unauthorized } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'sales_agent')) return forbidden();
  const { id } = await ctx.params;
  try {
    const body = await req.json();
    if (!body.message?.trim()) return fail('message required');
    const result = await runAgentTest(session.workspaceId, id, String(body.message).trim());
    return ok(result);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Test failed', 500);
  }
}
