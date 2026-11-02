import { getSession, hasMinRole } from '@/lib/auth';
import { sendWhatsAppTemplate } from '@/lib/whatsapp';
import { fail, forbidden, ok, unauthorized } from '@/lib/http';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'sales_agent')) return forbidden();
  try {
    const body = await req.json();
    if (!body.leadId) return fail('leadId required');
    const result = await sendWhatsAppTemplate(session.workspaceId, body.leadId, body.template || 'welcome');
    return ok({ result });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Send failed', 500);
  }
}
