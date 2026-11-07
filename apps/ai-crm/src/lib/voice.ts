import { crmMode } from './env';
import { query } from './db';
import { enqueueJob } from './jobs';
import { callBlockReason } from './calling-policy';
import { getWorkspaceSettings } from './settings';

export type CallStatus =
  | 'scheduled'
  | 'queued'
  | 'dialing'
  | 'ringing'
  | 'connected'
  | 'completed'
  | 'failed'
  | 'transferred'
  | 'cancelled'
  | 'blocked';

const ALLOWED: Record<string, CallStatus[]> = {
  scheduled: ['queued', 'cancelled', 'blocked'],
  queued: ['dialing', 'cancelled', 'failed', 'blocked'],
  dialing: ['ringing', 'failed', 'cancelled'],
  ringing: ['connected', 'failed', 'cancelled'],
  connected: ['completed', 'failed', 'transferred'],
  completed: [],
  failed: ['queued'],
  transferred: [],
  cancelled: [],
  blocked: ['queued', 'cancelled'],
};

export function canTransition(from: CallStatus, to: CallStatus) {
  return ALLOWED[from]?.includes(to) || from === to;
}

function telephonyConfigured() {
  const provider = (process.env.CRM_TELEPHONY_PROVIDER || '').toLowerCase();
  if (provider === 'mock') return Boolean(process.env.CRM_TELEPHONY_API_KEY);
  return Boolean(process.env.CRM_TELEPHONY_API_KEY && process.env.CRM_TELEPHONY_BASE_URL);
}

export async function scheduleCall(workspaceId: string, leadId: string, meta: Record<string, unknown> = {}) {
  const provider = telephonyConfigured()
    ? process.env.CRM_TELEPHONY_PROVIDER || 'telephony'
    : 'unconfigured';
  const { rows } = await query(
    `INSERT INTO crm.voice_calls (workspace_id, lead_id, status, provider, scheduled_at, meta)
     VALUES ($1,$2,'scheduled',$3,NOW(),$4::jsonb) RETURNING *`,
    [workspaceId, leadId, provider, JSON.stringify(meta)],
  );
  await query(
    `UPDATE crm.leads SET ai_calling_status='scheduled', updated_at=NOW() WHERE id=$1`,
    [leadId],
  );
  await query(
    `INSERT INTO crm.lead_activities (workspace_id, lead_id, activity_type, summary, payload)
     VALUES ($1,$2,'voice.scheduled','AI call scheduled',$3::jsonb)`,
    [workspaceId, leadId, JSON.stringify({ callId: rows[0].id, provider })],
  );
  const lead = (await query(`SELECT * FROM crm.leads WHERE id=$1`, [leadId])).rows[0];
  const settings = await getWorkspaceSettings(workspaceId);
  const blocked = lead ? callBlockReason(lead, settings.calling_policy) : 'Lead missing';
  if (blocked) {
    const call = await transitionCall(rows[0].id, 'blocked', {
      disposition: 'policy_blocked',
      summary: blocked,
      meta: { reason: blocked },
    });
    await query(`UPDATE crm.leads SET ai_calling_status='blocked', updated_at=NOW() WHERE id=$1`, [leadId]);
    await query(
      `INSERT INTO crm.lead_activities (workspace_id, lead_id, activity_type, summary, payload)
       VALUES ($1,$2,'voice.blocked',$3,$4::jsonb)`,
      [workspaceId, leadId, blocked, JSON.stringify({ callId: rows[0].id })],
    );
    return call;
  }
  await enqueueJob({
    workspaceId,
    jobType: 'voice.execute',
    payload: { callId: rows[0].id },
    runAt: new Date(Date.now() + 1000),
  });
  return rows[0];
}

export async function transitionCall(callId: string, to: CallStatus, patch: Record<string, unknown> = {}) {
  const current = (await query(`SELECT * FROM crm.voice_calls WHERE id=$1`, [callId])).rows[0];
  if (!current) throw new Error('Call not found');
  if (!canTransition(current.status, to)) {
    throw new Error(`Invalid call transition ${current.status} -> ${to}`);
  }
  const { rows } = await query(
    `UPDATE crm.voice_calls SET
      status=$2,
      started_at=COALESCE($3::timestamptz, started_at),
      ended_at=COALESCE($4::timestamptz, ended_at),
      disposition=COALESCE($5, disposition),
      summary=COALESCE($6, summary),
      transcript=COALESCE($7, transcript),
      meta = COALESCE(meta,'{}'::jsonb) || $8::jsonb
     WHERE id=$1 RETURNING *`,
    [
      callId,
      to,
      patch.startedAt || null,
      patch.endedAt || null,
      patch.disposition || null,
      patch.summary || null,
      patch.transcript || null,
      JSON.stringify(patch.meta || {}),
    ],
  );
  return rows[0];
}

/** Execute outbound call only when telephony is configured. Never invent transcripts. */
export async function executeCall(callId: string) {
  const call = (await query(`SELECT * FROM crm.voice_calls WHERE id=$1`, [callId])).rows[0];
  if (!call) throw new Error('Call not found');

  const leadRow = (await query(`SELECT * FROM crm.leads WHERE id=$1`, [call.lead_id])).rows[0];
  const settings = await getWorkspaceSettings(call.workspace_id);
  const policyBlock = leadRow ? callBlockReason(leadRow, settings.calling_policy) : 'Lead missing';
  if (policyBlock && call.status === 'scheduled') {
    return transitionCall(callId, 'blocked', {
      disposition: 'policy_blocked',
      summary: policyBlock,
      meta: { reason: policyBlock },
    });
  }

  if (call.status === 'scheduled') {
    await transitionCall(callId, 'queued');
  }

  if (!telephonyConfigured()) {
    const blocked = await transitionCall(callId, 'blocked', {
      disposition: 'provider_missing',
      summary: 'Outbound AI call blocked: telephony provider credentials are not configured.',
      meta: { reason: 'missing_telephony', mode: crmMode() },
    });
    await query(
      `UPDATE crm.leads SET ai_calling_status='blocked', updated_at=NOW() WHERE id=$1`,
      [call.lead_id],
    );
    await query(
      `INSERT INTO crm.lead_activities (workspace_id, lead_id, activity_type, summary, payload)
       VALUES ($1,$2,'voice.blocked','AI call blocked — telephony not configured',$3::jsonb)`,
      [call.workspace_id, call.lead_id, JSON.stringify({ callId })],
    );
    await query(
      `INSERT INTO crm.tasks (workspace_id, lead_id, title, priority, status, due_at)
       VALUES ($1,$2,'Manual sales call required (AI telephony unavailable)','high','open', NOW() + INTERVAL '1 day')`,
      [call.workspace_id, call.lead_id],
    );
    return blocked;
  }

  const lead = (await query(`SELECT * FROM crm.leads WHERE id=$1`, [call.lead_id])).rows[0];
  const { placeOutboundCall, telephonyConfig } = await import('./telephony-ivr');
  const cfg = telephonyConfig();
  const base = process.env.CRM_PUBLIC_WEBHOOK_BASE_URL || process.env.CRM_WEB_URL || 'https://aicrm.techantum.info';
  const dial = await placeOutboundCall({
    callId: call.id,
    to: lead?.phone_normalized || lead?.phone || '',
    language: lead?.preferred_language || 'en',
    webhookUrl: `${base}/api/v1/webhooks/telephony`,
    metadata: { workspaceId: call.workspace_id, leadId: call.lead_id },
  });
  if (!dial.ok) {
    return transitionCall(callId, dial.status === 'blocked' ? 'blocked' : 'failed', {
      disposition: dial.status,
      summary: dial.reason,
      meta: { provider: cfg.provider, dial },
    });
  }
  return transitionCall(callId, 'dialing', {
    startedAt: new Date().toISOString(),
    meta: { provider: cfg.provider, providerCallId: dial.providerCallId, dial },
  });
}

/** @deprecated use executeCall */
export async function executeSandboxCall(callId: string) {
  return executeCall(callId);
}
