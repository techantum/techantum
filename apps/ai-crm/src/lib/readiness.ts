import { query } from './db';
import { getWorkspaceSettings } from './settings';
import { inspectWhatsAppAccount } from './whatsapp-account';

export type GapItem = {
  id: string;
  area: string;
  item: string;
  status: 'ready' | 'partial' | 'pending';
  owner: 'app' | 'you';
  detail: string;
};

function flag(ok: boolean) {
  return ok ? 'ready' : 'pending';
}

async function isolatedDatabaseStatus() {
  const url = process.env.CRM_DIRECT_URL || process.env.CRM_DATABASE_URL || '';
  if (process.env.CRM_DATA_ISOLATED !== 'true' || /supabase\.com/i.test(url)) return 'pending' as const;
  const info = await query(`SELECT current_database() AS name`);
  return info.rows[0]?.name === 'ai_crm' ? 'ready' : 'partial';
}

async function isolatedDatabaseDetail() {
  const info = await query(`SELECT current_database() AS name`);
  const name = info.rows[0]?.name || 'unknown';
  if (name === 'ai_crm' && process.env.CRM_DATA_ISOLATED === 'true') {
    return 'Dedicated Postgres database ai_crm on port 5433. The CRM schema is not stored in the shared application database.';
  }
  return 'Point CRM_DATABASE_URL and CRM_DIRECT_URL at the dedicated ai_crm database and set CRM_DATA_ISOLATED=true.';
}

export async function readinessReport(workspaceId: string) {
  const settings = await getWorkspaceSettings(workspaceId);
  const users = await query(`SELECT role FROM crm.users WHERE workspace_id=$1 AND status='active'`, [workspaceId]);
  const roles = new Set(users.rows.map((row) => row.role));
  const knowledge = await query(`SELECT COUNT(*)::int AS n FROM crm.knowledge_documents WHERE workspace_id=$1`, [workspaceId]);
  const leads = await query(
    `SELECT qualification_status, COUNT(*)::int AS n FROM crm.leads WHERE workspace_id=$1 GROUP BY qualification_status`,
    [workspaceId],
  );
  const priorities = new Set(leads.rows.map((row) => row.qualification_status));
  const agent = (
    await query(`SELECT languages FROM crm.ai_agents WHERE workspace_id=$1 ORDER BY updated_at DESC LIMIT 1`, [workspaceId])
  ).rows[0];
  const languages = agent?.languages || [];
  const needed = ['en', 'hi', 'bn', 'ta', 'te', 'mr'];
  const webhook = process.env.CRM_PUBLIC_WEBHOOK_BASE_URL || '';
  const telephonyReal =
    (process.env.CRM_TELEPHONY_PROVIDER || '').toLowerCase() !== 'mock' &&
    Boolean(process.env.CRM_TELEPHONY_API_KEY && process.env.CRM_TELEPHONY_BASE_URL) &&
    !String(process.env.CRM_TELEPHONY_BASE_URL || '').startsWith('mock');
  const ops = settings.ops_profile || {};
  const whatsapp = await inspectWhatsAppAccount().catch(() => ({ ok: false as const, reason: 'Meta check failed.' }));
  const items: GapItem[] = [
    {
      id: 'roles',
      area: 'Core',
      item: 'CRM roles',
      status: ['sales_manager', 'sales_agent', 'document_reviewer'].every((role) => roles.has(role)) ? 'ready' : 'partial',
      owner: 'app',
      detail: `Active roles: ${Array.from(roles).join(', ') || 'none'}`,
    },
    {
      id: 'samples',
      area: 'Core',
      item: 'Sample leads and knowledge',
      status: priorities.has('hot') && priorities.has('warm') && priorities.has('cold') && Number(knowledge.rows[0]?.n) > 0 ? 'ready' : 'partial',
      owner: 'app',
      detail: `Knowledge docs: ${knowledge.rows[0]?.n || 0}. Priorities present: ${Array.from(priorities).filter(Boolean).join(', ') || 'none'}.`,
    },
    {
      id: 'db',
      area: 'Core',
      item: 'Isolated database',
      status: await isolatedDatabaseStatus(),
      owner: 'app',
      detail: await isolatedDatabaseDetail(),
    },
    {
      id: 'wa-portfolio',
      area: 'WhatsApp',
      item: 'Meta Business portfolio and WhatsApp Business Account',
      status: whatsapp.ok && whatsapp.account.review === 'APPROVED' ? 'ready' : 'pending',
      owner: 'app',
      detail: whatsapp.ok ? `${whatsapp.account.name} is ${whatsapp.account.review}.` : whatsapp.reason,
    },
    {
      id: 'wa-phone',
      area: 'WhatsApp',
      item: 'Registered WhatsApp phone number and Phone Number ID',
      status: whatsapp.ok && whatsapp.phone.verifiedName ? 'ready' : 'pending',
      owner: 'app',
      detail: whatsapp.ok
        ? `${whatsapp.phone.verifiedName}, quality ${whatsapp.phone.quality}, certificate ${whatsapp.phone.code}.`
        : whatsapp.reason,
    },
    {
      id: 'wa-token',
      area: 'WhatsApp',
      item: 'Cloud API permissions and access token',
      status: whatsapp.ok ? 'ready' : 'pending',
      owner: 'app',
      detail: whatsapp.ok ? 'Meta accepted the token for this WABA and phone number.' : whatsapp.reason,
    },
    {
      id: 'wa-template',
      area: 'WhatsApp',
      item: 'Approved opening message templates',
      status: whatsapp.ok && whatsapp.template?.status === 'APPROVED' ? 'ready' : 'pending',
      owner: 'app',
      detail: whatsapp.ok && whatsapp.template
        ? `${whatsapp.template.name} (${whatsapp.template.language}) is ${whatsapp.template.status}.`
        : 'Opening template was not found as approved on this WABA.',
    },
    {
      id: 'wa-consent',
      area: 'WhatsApp',
      item: 'Consent and STOP opt-out',
      status: 'ready',
      owner: 'app',
      detail: 'Outbound is blocked after opt-out. Inbound STOP sets WhatsApp and calling consent to denied.',
    },
    {
      id: 'wa-webhook',
      area: 'WhatsApp',
      item: 'Public HTTPS webhook',
      status: webhook.startsWith('https://') ? 'ready' : 'pending',
      owner: 'you',
      detail: `Current base is ${webhook || 'unset'}. Set CRM_PUBLIC_WEBHOOK_BASE_URL to your public https domain.`,
    },
    {
      id: 'telephony',
      area: 'AI calling',
      item: 'Telephony account, caller ID, and API keys',
      status: telephonyReal ? 'ready' : 'pending',
      owner: 'you',
      detail: 'Set CRM_TELEPHONY_PROVIDER, base URL, API key, and CRM_TELEPHONY_CALLER_ID from Exotel or your IVR. Mock mode is not live calling.',
    },
    {
      id: 'stream',
      area: 'AI calling',
      item: 'Bidirectional audio and transfer',
      status: process.env.CRM_TELEPHONY_STREAM_URL && process.env.CRM_TELEPHONY_TRANSFER_QUEUE ? 'partial' : 'pending',
      owner: 'you',
      detail: 'Provide the provider streaming URL and transfer queue. The app accepts stream events at /api/v1/webhooks/telephony/stream.',
    },
    {
      id: 'llm',
      area: 'AI calling',
      item: 'Working LLM key',
      status: 'pending',
      owner: 'you',
      detail: 'Set a valid CRM_LLM_API_KEY. The current OpenAI key was rejected.',
    },
    {
      id: 'speech',
      area: 'AI calling',
      item: 'Speech-to-text and text-to-speech',
      status: process.env.CRM_STT_API_KEY && process.env.CRM_TTS_API_KEY ? 'partial' : 'pending',
      owner: 'you',
      detail: 'Set CRM_STT_API_KEY and CRM_TTS_API_KEY. Sarvam is the suggested vendor for the six Indian languages.',
    },
    {
      id: 'languages',
      area: 'AI calling',
      item: 'Six languages and recorded test calls',
      status: needed.every((lang) => languages.includes(lang)) ? 'partial' : 'pending',
      owner: 'you',
      detail: 'Agent languages can be enabled in the app. Upload real telephone recordings on the agent page before a language sign-off.',
    },
    {
      id: 'calling-consent',
      area: 'AI calling',
      item: 'Calling consent and permitted window',
      status: 'ready',
      owner: 'app',
      detail: 'Dial requires calling_consent=granted, blocks opt-out, and enforces 09:00–19:00 Mon–Sat unless you change the policy.',
    },
    {
      id: 'capacity',
      area: 'AI calling',
      item: 'Concurrent capacity and provider price',
      status: ops.pricingConfirmed ? 'ready' : 'pending',
      owner: 'you',
      detail: 'App cap is stored in settings. Confirm the IVR channel count and per-minute price, then set pricingConfirmed on the readiness page.',
    },
    {
      id: 'retention',
      area: 'Production',
      item: 'Retention and deletion',
      status: settings.retention_policy ? 'partial' : 'pending',
      owner: 'you',
      detail: 'Defaults: messages 180 days, recordings 90 days, documents 365 days. Run purge from Readiness and use Erase customer on a lead. Have counsel confirm the periods.',
    },
    {
      id: 'hosting',
      area: 'Production',
      item: 'Security and hosting',
      status: webhook.startsWith('https://') && process.env.CRM_DATA_ISOLATED === 'true' ? 'partial' : 'pending',
      owner: 'you',
      detail: 'Host the app behind TLS, use the CRM database only, and set object storage with CRM_OBJECT_STORAGE_URL.',
    },
    {
      id: 'kyc',
      area: 'Production',
      item: 'Legal document verification',
      status: process.env.CRM_KYC_PROVIDER && process.env.CRM_KYC_AUTHORIZATION_REF ? 'partial' : 'pending',
      owner: 'you',
      detail: 'In-app checks stay assistive. Set CRM_KYC_PROVIDER and CRM_KYC_AUTHORIZATION_REF only after a licensed KYC authorization exists.',
    },
    {
      id: 'load',
      area: 'Production',
      item: 'Load-test targets',
      status: 'partial',
      owner: 'you',
      detail: 'Targets live in ops profile. Run npm run load:check against the hosted URL and record the result.',
    },
    {
      id: 'ops',
      area: 'Production',
      item: 'Monitoring, incidents, budget, and owner',
      status: ops.serviceOwner && ops.incidentContact ? 'partial' : 'pending',
      owner: 'you',
      detail: 'Set the service owner, incident contact, and alert webhook. Budget figures on /costs are planning numbers until you confirm contracts.',
    },
  ];
  const pending = items.filter((item) => item.status !== 'ready');
  return { items, pendingCount: pending.length, readyCount: items.length - pending.length };
}
