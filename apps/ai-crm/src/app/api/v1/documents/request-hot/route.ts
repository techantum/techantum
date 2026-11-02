import { getSession, hasMinRole } from '@/lib/auth';
import { requestHotLeadDocuments } from '@/lib/document-verify';
import { fail, forbidden, ok, unauthorized } from '@/lib/http';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'sales_agent')) return forbidden();
  try {
    const body = await req.json();
    if (!body.leadId) return fail('leadId required');
    const result = await requestHotLeadDocuments(session.workspaceId, body.leadId);
    return ok(result);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Request failed', 500);
  }
}
