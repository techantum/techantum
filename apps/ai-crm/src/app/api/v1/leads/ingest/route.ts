import { getSession, hasMinRole } from '@/lib/auth';
import { ingestLead } from '@/lib/ingest';
import { created, fail, forbidden, unauthorized } from '@/lib/http';
import { query } from '@/lib/db';

export async function POST(req: Request) {
  const session = await getSession();
  const apiKey = req.headers.get('x-crm-ingest-key');
  let workspaceId = session?.workspaceId;
  let actorUserId = session?.id || null;

  if (!session) {
    if (!apiKey) return unauthorized();
    const { rows } = await query(
      `SELECT workspace_id FROM crm.integrations
       WHERE provider='ingest_api' AND (config->>'apiKey')=$1 LIMIT 1`,
      [apiKey],
    );
    // Fallback: demo workspace when sandbox key matches env
    if (!rows[0]) {
      if (apiKey !== (process.env.CRM_INGEST_API_KEY || 'crm-sandbox-ingest-key')) {
        return unauthorized('Invalid ingest key');
      }
      const ws = await query(`SELECT id FROM crm.workspaces ORDER BY created_at ASC LIMIT 1`);
      workspaceId = ws.rows[0]?.id;
    } else {
      workspaceId = rows[0].workspace_id;
    }
  } else if (!hasMinRole(session, 'sales_agent')) {
    return forbidden();
  }

  if (!workspaceId) return fail('No workspace configured', 500);

  try {
    const body = await req.json();
    const result = await ingestLead({
      workspaceId,
      source: body.source || 'api',
      fullName: body.fullName || body.name,
      phone: body.phone,
      email: body.email,
      campaign: body.campaign,
      externalSourceLeadId: body.externalSourceLeadId || body.externalId,
      customAttributes: body.customAttributes || body.attributes || {},
      consentStatus: body.consentStatus || 'granted',
      actorUserId,
      eventKey: body.idempotencyKey,
      raw: body,
    });
    return created(result);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Ingest failed', 500);
  }
}
