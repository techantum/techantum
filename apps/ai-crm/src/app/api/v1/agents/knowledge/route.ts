import { getSession, hasMinRole } from '@/lib/auth';
import { listKnowledge, upsertKnowledge } from '@/lib/agents';
import { created, fail, forbidden, ok, unauthorized } from '@/lib/http';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  const agentId = new URL(req.url).searchParams.get('agentId') || undefined;
  const rows = await listKnowledge(session.workspaceId, agentId);
  return ok(rows);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'business_admin')) return forbidden();
  try {
    const body = await req.json();
    if (!body.title || !body.content) return fail('title and content required');
    const doc = await upsertKnowledge(session.workspaceId, {
      id: body.id,
      agentId: body.agentId,
      title: body.title,
      docType: body.docType,
      content: body.content,
    });
    return created({ document: doc });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Save failed', 500);
  }
}
