import { query } from './db';
import { ensureEnv } from './env';

export type ZohoLeadPayload = {
  First_Name?: string;
  Last_Name?: string;
  Full_Name?: string;
  Phone?: string;
  Email?: string;
  Lead_Source?: string;
  Description?: string;
  [key: string]: unknown;
};

async function getConnection(workspaceId: string) {
  const { rows } = await query(`SELECT * FROM crm.zoho_connections WHERE workspace_id=$1`, [workspaceId]);
  if (rows[0]) return rows[0];
  const created = await query(
    `INSERT INTO crm.zoho_connections (workspace_id, status) VALUES ($1,'not_connected')
     ON CONFLICT (workspace_id) DO UPDATE SET updated_at=NOW() RETURNING *`,
    [workspaceId],
  );
  return created.rows[0];
}

function zohoConfigured() {
  ensureEnv();
  return Boolean(
    process.env.CRM_ZOHO_REFRESH_TOKEN &&
      process.env.CRM_ZOHO_CLIENT_ID &&
      process.env.CRM_ZOHO_CLIENT_SECRET,
  );
}

async function getAccessToken() {
  ensureEnv();
  if (!zohoConfigured()) return null;
  const accounts = process.env.CRM_ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.in';
  const res = await fetch(`${accounts}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: process.env.CRM_ZOHO_REFRESH_TOKEN!,
      client_id: process.env.CRM_ZOHO_CLIENT_ID!,
      client_secret: process.env.CRM_ZOHO_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Zoho token refresh failed');
  return json.access_token as string;
}

export async function getZohoStatus(workspaceId: string) {
  const conn = await getConnection(workspaceId);
  return {
    ...conn,
    credentialsPresent: zohoConfigured(),
    status: zohoConfigured() ? conn.status === 'not_connected' ? 'credentials_present' : conn.status : 'not_connected',
  };
}

export async function upsertZohoConnection(workspaceId: string, patch: Record<string, unknown>) {
  const { rows } = await query(
    `INSERT INTO crm.zoho_connections (workspace_id, api_domain, accounts_domain, field_map, status, updated_at)
     VALUES ($1,$2,$3,$4::jsonb,$5,NOW())
     ON CONFLICT (workspace_id) DO UPDATE SET
       api_domain=COALESCE(EXCLUDED.api_domain, crm.zoho_connections.api_domain),
       accounts_domain=COALESCE(EXCLUDED.accounts_domain, crm.zoho_connections.accounts_domain),
       field_map=COALESCE(EXCLUDED.field_map, crm.zoho_connections.field_map),
       status=EXCLUDED.status,
       updated_at=NOW()
     RETURNING *`,
    [
      workspaceId,
      patch.apiDomain || 'https://www.zohoapis.in',
      patch.accountsDomain || 'https://accounts.zoho.in',
      JSON.stringify(patch.fieldMap || {}),
      zohoConfigured() ? 'connected' : 'not_connected',
    ],
  );
  return rows[0];
}

export async function pushLeadToZoho(workspaceId: string, lead: any) {
  const token = await getAccessToken();
  const conn = await getConnection(workspaceId);
  const payload: ZohoLeadPayload = {
    Last_Name: lead.full_name || 'Unknown',
    Phone: lead.phone,
    Email: lead.email,
    Lead_Source: lead.source,
    Description: `Qualification: ${lead.qualification_status} (${lead.lead_score}). WhatsApp: ${lead.whatsapp_status}. AI call: ${lead.ai_calling_status}`,
  };

  if (!token) {
    await query(
      `INSERT INTO crm.zoho_sync_logs (workspace_id, direction, entity_type, entity_id, status, payload, error)
       VALUES ($1,'outbound','lead',$2,'queued_offline',$3::jsonb,$4)`,
      [workspaceId, lead.id, JSON.stringify(payload), 'Zoho credentials missing — queued locally'],
    );
    return { queued: true, mode: 'offline' };
  }

  const api = conn.api_domain || process.env.CRM_ZOHO_API_DOMAIN || 'https://www.zohoapis.in';
  const res = await fetch(`${api}/crm/v2/Leads`, {
    method: lead.zoho_id ? 'PUT' : 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: [lead.zoho_id ? { id: lead.zoho_id, ...payload } : payload],
    }),
  });
  const json = await res.json();
  const zohoId = json?.data?.[0]?.details?.id || lead.zoho_id || null;
  if (zohoId) {
    await query(`UPDATE crm.leads SET zoho_id=$2, updated_at=NOW() WHERE id=$1`, [lead.id, zohoId]);
  }
  await query(
    `INSERT INTO crm.zoho_sync_logs (workspace_id, direction, entity_type, entity_id, status, payload, error)
     VALUES ($1,'outbound','lead',$2,$3,$4::jsonb,$5)`,
    [
      workspaceId,
      lead.id,
      res.ok ? 'synced' : 'failed',
      JSON.stringify({ request: payload, response: json }),
      res.ok ? null : json?.message || 'Zoho sync failed',
    ],
  );
  await query(`UPDATE crm.zoho_connections SET last_sync_at=NOW(), last_error=$2, status=$3 WHERE workspace_id=$1`, [
    workspaceId,
    res.ok ? null : json?.message || 'sync failed',
    res.ok ? 'connected' : 'error',
  ]);
  if (!res.ok) throw new Error(json?.message || 'Zoho sync failed');
  return { queued: false, mode: 'live', zohoId };
}

export async function importZohoLead(workspaceId: string, record: any) {
  const { createOrUpsertLead } = await import('./leads');
  const name = record.Full_Name || [record.First_Name, record.Last_Name].filter(Boolean).join(' ') || record.Last_Name;
  const result = await createOrUpsertLead({
    workspaceId,
    fullName: name,
    phone: record.Phone || record.Mobile,
    email: record.Email,
    source: 'zoho',
    campaign: record.Lead_Source,
    externalSourceLeadId: record.id,
    customAttributes: { zoho: record },
    consentStatus: 'granted',
  });
  if (record.id) {
    await query(`UPDATE crm.leads SET zoho_id=$2 WHERE id=$1`, [result.lead.id, String(record.id)]);
  }
  await query(
    `INSERT INTO crm.zoho_sync_logs (workspace_id, direction, entity_type, entity_id, status, payload)
     VALUES ($1,'inbound','lead',$2,'imported',$3::jsonb)`,
    [workspaceId, result.lead.id, JSON.stringify(record)],
  );
  return result;
}

export async function listZohoLogs(workspaceId: string) {
  const { rows } = await query(
    `SELECT * FROM crm.zoho_sync_logs WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 50`,
    [workspaceId],
  );
  return rows;
}
