import { getSession, hasMinRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { crmMode } from '@/lib/env';
import { fail, forbidden, ok, unauthorized } from '@/lib/http';

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  const { rows } = await query(`SELECT id, provider, status, last_tested_at, created_at, config FROM crm.integrations WHERE workspace_id=$1`, [
    session.workspaceId,
  ]);
  const sanitized = rows.map((r) => ({
    ...r,
    config: {
      configuredKeys: Object.keys(r.config || {}),
      mode: crmMode(),
    },
  }));
  return ok({
    mode: crmMode(),
    integrations: sanitized,
    liveReadiness: {
      whatsapp: Boolean(process.env.CRM_WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN),
      telephony:
        (process.env.CRM_TELEPHONY_PROVIDER || '').toLowerCase() === 'mock'
          ? Boolean(process.env.CRM_TELEPHONY_API_KEY)
          : Boolean(process.env.CRM_TELEPHONY_API_KEY && process.env.CRM_TELEPHONY_BASE_URL),
      llm: Boolean(process.env.CRM_LLM_API_KEY || process.env.OPENAI_API_KEY),
      zoho: Boolean(process.env.CRM_ZOHO_CLIENT_ID && process.env.CRM_ZOHO_REFRESH_TOKEN),
      googleAds: Boolean(process.env.CRM_GOOGLE_LEAD_WEBHOOK_KEY),
    },
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'business_admin')) return forbidden();
  const body = await req.json();
  if (!body.provider) return fail('provider required');
  const { rows } = await query(
    `INSERT INTO crm.integrations (workspace_id, provider, status, config, last_tested_at)
     VALUES ($1,$2,$3,$4::jsonb,NOW())
     ON CONFLICT (workspace_id, provider)
     DO UPDATE SET status=EXCLUDED.status, config=EXCLUDED.config, last_tested_at=NOW()
     RETURNING id, provider, status, last_tested_at`,
    [session.workspaceId, body.provider, body.status || 'sandbox', JSON.stringify(body.config || {})],
  );
  return ok({ integration: rows[0] });
}
