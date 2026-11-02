import { getSession, hasMinRole } from '@/lib/auth';
import { getZohoStatus, importZohoLead, listZohoLogs, pushLeadToZoho, upsertZohoConnection } from '@/lib/zoho';
import { query } from '@/lib/db';
import { fail, forbidden, ok, unauthorized } from '@/lib/http';

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  const [status, logs] = await Promise.all([
    getZohoStatus(session.workspaceId),
    listZohoLogs(session.workspaceId),
  ]);
  return ok({ connection: status, logs });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'business_admin')) return forbidden();
  const body = await req.json();
  const connection = await upsertZohoConnection(session.workspaceId, body);
  return ok({ connection });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'sales_manager')) return forbidden();
  try {
    const body = await req.json();
    if (body.action === 'import' && body.record) {
      const result = await importZohoLead(session.workspaceId, body.record);
      return ok(result);
    }
    if (body.action === 'push' && body.leadId) {
      const lead = (await query(`SELECT * FROM crm.leads WHERE workspace_id=$1 AND id=$2`, [session.workspaceId, body.leadId])).rows[0];
      if (!lead) return fail('Lead not found', 404);
      const result = await pushLeadToZoho(session.workspaceId, lead);
      return ok(result);
    }
    return fail('action must be import or push');
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Zoho operation failed', 500);
  }
}
