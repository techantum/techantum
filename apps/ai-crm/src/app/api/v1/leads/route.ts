import { getSession, hasMinRole } from '@/lib/auth';
import { createOrUpsertLead, listLeads } from '@/lib/leads';
import { created, fail, forbidden, ok, unauthorized } from '@/lib/http';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  const url = new URL(req.url);
  const data = await listLeads({
    workspaceId: session.workspaceId,
    q: url.searchParams.get('q') || undefined,
    stage: url.searchParams.get('stage') || undefined,
    source: url.searchParams.get('source') || undefined,
    page: Number(url.searchParams.get('page') || 1),
    pageSize: Number(url.searchParams.get('pageSize') || 25),
  });
  return ok(data);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'sales_agent')) return forbidden();
  try {
    const body = await req.json();
    const result = await createOrUpsertLead({
      workspaceId: session.workspaceId,
      fullName: body.fullName || body.name,
      phone: body.phone,
      email: body.email,
      source: body.source || 'manual',
      campaign: body.campaign,
      externalSourceLeadId: body.externalSourceLeadId,
      customAttributes: body.customAttributes || {},
      assignedUserId: body.assignedUserId,
      consentStatus: body.consentStatus || 'granted',
      notes: body.notes,
      tags: body.tags,
      actorUserId: session.id,
    });
    return created(result);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Create failed', 500);
  }
}
