import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { ok, unauthorized } from '@/lib/http';
import { crmMode } from '@/lib/env';

const CATALOG = [
  { id: 'google_ads', name: 'Google Ads', method: 'OAuth / webhook', native: false },
  { id: 'meta_leads', name: 'Meta Lead Ads', method: 'OAuth / webhook', native: false },
  { id: 'website', name: 'Website Form', method: 'Webhook', native: false },
  { id: 'whatsapp', name: 'WhatsApp', method: 'Cloud API', native: false },
  { id: 'csv', name: 'CSV Import', method: 'File upload', native: true },
  { id: 'webhook', name: 'Webhook', method: 'HTTP', native: true },
  { id: 'api', name: 'REST API', method: 'API key', native: true },
  { id: 'manual', name: 'Manual Entry', method: 'UI', native: true },
];

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const [counts, integrations, events] = await Promise.all([
    query(
      `SELECT source, COUNT(*)::int AS count,
              MAX(created_at) AS last_lead_at
       FROM crm.leads WHERE workspace_id=$1 GROUP BY source`,
      [session.workspaceId],
    ),
    query(`SELECT * FROM crm.integrations WHERE workspace_id=$1`, [session.workspaceId]),
    query(
      `SELECT id, provider, event_key, status, created_at
       FROM crm.webhook_events
       WHERE workspace_id=$1 OR workspace_id IS NULL
       ORDER BY created_at DESC LIMIT 25`,
      [session.workspaceId],
    ),
  ]);

  const countMap = Object.fromEntries(counts.rows.map((r: any) => [r.source, r]));
  const integMap = Object.fromEntries(integrations.rows.map((r: any) => [r.provider, r]));

  const live = {
    whatsapp: Boolean(process.env.CRM_WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN),
    googleAds: Boolean(process.env.CRM_GOOGLE_LEAD_WEBHOOK_KEY),
    meta: Boolean(process.env.CRM_META_APP_SECRET || process.env.META_APP_SECRET),
    llm: Boolean(process.env.CRM_LLM_API_KEY || process.env.OPENAI_API_KEY),
  };

  const sources = CATALOG.map((s) => {
    const connected =
      s.native ||
      (s.id === 'whatsapp' && live.whatsapp) ||
      (s.id === 'google_ads' && live.googleAds) ||
      (s.id === 'meta_leads' && live.meta) ||
      Boolean(integMap[s.id]);
    return {
      ...s,
      connected,
      status: connected ? (s.native ? 'native' : 'credentials_present') : 'not_connected',
      leadCount: countMap[s.id]?.count || 0,
      lastLeadAt: countMap[s.id]?.last_lead_at || null,
      integration: integMap[s.id]
        ? { id: integMap[s.id].id, status: integMap[s.id].status, lastTestedAt: integMap[s.id].last_tested_at }
        : null,
    };
  });

  return ok({
    mode: crmMode(),
    liveReadiness: live,
    sources,
    events: events.rows,
  });
}
