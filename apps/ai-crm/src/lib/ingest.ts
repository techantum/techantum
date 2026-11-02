import { createOrUpsertLead } from './leads';
import { query } from './db';
import { sha256 } from './crypto';

export type IngestPayload = {
  workspaceId: string;
  source: string;
  fullName?: string;
  phone?: string;
  email?: string;
  campaign?: string;
  externalSourceLeadId?: string;
  customAttributes?: Record<string, unknown>;
  consentStatus?: string;
  actorUserId?: string | null;
  eventKey?: string;
  raw?: unknown;
};

export async function ingestLead(payload: IngestPayload) {
  const eventKey = payload.eventKey || sha256(JSON.stringify({
    source: payload.source,
    external: payload.externalSourceLeadId,
    phone: payload.phone,
    email: payload.email,
    campaign: payload.campaign,
  }));

  try {
    await query(
      `INSERT INTO crm.webhook_events (workspace_id, provider, event_key, payload, status)
       VALUES ($1,$2,$3,$4::jsonb,'received')`,
      [payload.workspaceId, payload.source, eventKey, JSON.stringify(payload.raw ?? payload)],
    );
  } catch {
    const existing = await query(
      `SELECT id FROM crm.webhook_events WHERE provider=$1 AND event_key=$2`,
      [payload.source, eventKey],
    );
    if (existing.rows[0]) {
      return { duplicateEvent: true, eventKey };
    }
  }

  const result = await createOrUpsertLead({
    workspaceId: payload.workspaceId,
    fullName: payload.fullName,
    phone: payload.phone,
    email: payload.email,
    source: payload.source,
    campaign: payload.campaign,
    externalSourceLeadId: payload.externalSourceLeadId,
    customAttributes: payload.customAttributes,
    consentStatus: payload.consentStatus,
    actorUserId: payload.actorUserId,
  });

  await query(
    `UPDATE crm.webhook_events SET status='processed' WHERE provider=$1 AND event_key=$2`,
    [payload.source, eventKey],
  );

  return { ...result, eventKey, duplicateEvent: false };
}

export function parseGoogleLeadForm(body: any) {
  const answers = body?.user_column_data || body?.lead?.user_column_data || [];
  const map: Record<string, string> = {};
  for (const a of answers) {
    const key = String(a.column_id || a.column_name || '').toLowerCase();
    map[key] = String(a.string_value || a.value || '');
  }
  return {
    fullName: map['full_name'] || map['name'] || body?.full_name,
    phone: map['phone_number'] || map['phone'] || body?.phone_number,
    email: map['email'] || body?.email,
    externalSourceLeadId: String(body?.lead_id || body?.id || ''),
    campaign: body?.campaign_id || body?.form_id || undefined,
    customAttributes: { provider: 'google_ads', raw: body },
  };
}

export function parseMetaLead(body: any) {
  const fieldData = body?.field_data || body?.entry?.[0]?.changes?.[0]?.value?.field_data || [];
  const map: Record<string, string> = {};
  for (const f of fieldData) {
    map[String(f.name || '').toLowerCase()] = Array.isArray(f.values) ? String(f.values[0] || '') : String(f.value || '');
  }
  return {
    fullName: map.full_name || map.name,
    phone: map.phone_number || map.phone,
    email: map.email,
    externalSourceLeadId: String(body?.leadgen_id || body?.id || ''),
    campaign: body?.ad_id || body?.form_id,
    customAttributes: { provider: 'meta_leads', raw: body },
  };
}
