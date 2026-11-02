import { getSession, hasMinRole } from '@/lib/auth';
import { getOrCreateWhatsAppAgent, listAgents, listKnowledge } from '@/lib/agents';
import { ok, unauthorized, forbidden } from '@/lib/http';

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  const agents = await listAgents(session.workspaceId);
  if (!agents.length) {
    await getOrCreateWhatsAppAgent(session.workspaceId);
  }
  const list = await listAgents(session.workspaceId);
  const knowledge = await listKnowledge(session.workspaceId);
  return ok({ agents: list, knowledge });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'business_admin')) return forbidden();
  const body = await req.json();
  const agent = await getOrCreateWhatsAppAgent(session.workspaceId);
  return ok({ agent, requested: body });
}
