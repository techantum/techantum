import { ensureEnv, crmMode } from './env';
import { query } from './db';
import { transitionCall, type CallStatus } from './voice';

/**
 * Provider-agnostic IVR / telephony adapter.
 * Wire your existing IVR by setting:
 *  CRM_TELEPHONY_PROVIDER, CRM_TELEPHONY_API_KEY, CRM_TELEPHONY_API_SECRET,
 *  CRM_TELEPHONY_BASE_URL, CRM_TELEPHONY_TRANSFER_QUEUE
 */
export type DialRequest = {
  callId: string;
  to: string;
  from?: string;
  language?: string;
  webhookUrl: string;
  transferQueue?: string;
  metadata?: Record<string, unknown>;
};

export function telephonyConfig() {
  ensureEnv();
  const provider = (process.env.CRM_TELEPHONY_PROVIDER || '').toLowerCase();
  const isMock = provider === 'mock';
  return {
    provider,
    baseUrl: process.env.CRM_TELEPHONY_BASE_URL || '',
    configured: isMock
      ? Boolean(process.env.CRM_TELEPHONY_API_KEY)
      : Boolean(process.env.CRM_TELEPHONY_API_KEY && process.env.CRM_TELEPHONY_BASE_URL),
    transferQueue: process.env.CRM_TELEPHONY_TRANSFER_QUEUE || '',
    mode: crmMode(),
    maxConcurrency: Number(process.env.CRM_MAX_CONCURRENCY || 5),
    isMock,
  };
}

async function simulateMockCallProgress(req: DialRequest) {
  const workspaceId = String(req.metadata?.workspaceId || '');
  if (!workspaceId) return;
  const events = [
    { status: 'ringing', delayMs: 400 },
    { status: 'connected', delayMs: 700 },
    {
      status: 'completed',
      delayMs: 900,
      disposition: 'mock_handshake',
      summary:
        'Mock telephony completed the dial/connect/hangup handshake. No live audio or customer transcript was generated.',
    },
  ] as const;

  for (const ev of events) {
    await new Promise((r) => setTimeout(r, ev.delayMs));
    try {
      await handleIvrWebhook(workspaceId, {
        call_id: req.callId,
        status: ev.status,
        disposition: 'disposition' in ev ? ev.disposition : undefined,
        summary: 'summary' in ev ? ev.summary : undefined,
        provider: 'mock',
        id: `mock_${req.callId}_${ev.status}`,
      });
    } catch {
      /* ignore race if call already terminal */
    }
  }
}

export async function placeOutboundCall(req: DialRequest) {
  const cfg = telephonyConfig();
  if (!cfg.configured) {
    return {
      ok: false as const,
      status: 'blocked',
      reason: 'Telephony/IVR not configured. Set CRM_TELEPHONY_BASE_URL + CRM_TELEPHONY_API_KEY (or CRM_TELEPHONY_PROVIDER=mock).',
    };
  }

  // Local test provider: exercises dial → webhook state machine without PSTN audio/transcripts.
  if (cfg.isMock) {
    const providerCallId = `mock_${Date.now()}`;
    void simulateMockCallProgress(req);
    return { ok: true as const, status: 'dialing', providerCallId, raw: { mock: true } };
  }

  const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/calls/outbound`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.CRM_TELEPHONY_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Api-Secret': process.env.CRM_TELEPHONY_API_SECRET || '',
    },
    body: JSON.stringify({
      call_id: req.callId,
      to: req.to,
      from: req.from,
      language: req.language || 'en',
      status_webhook: req.webhookUrl,
      transfer_queue: req.transferQueue || cfg.transferQueue,
      metadata: req.metadata || {},
      provider: cfg.provider,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false as const, status: 'failed', reason: json?.message || `IVR HTTP ${res.status}`, raw: json };
  }
  return { ok: true as const, status: 'dialing', providerCallId: json.id || json.call_id, raw: json };
}

export async function handleIvrWebhook(workspaceId: string, body: any) {
  const callId = body.call_id || body.metadata?.callId || body.client_call_id;
  if (!callId) throw new Error('call_id missing');
  const status = String(body.status || body.event || '').toLowerCase();

  const map: Record<string, string> = {
    queued: 'queued',
    dialing: 'dialing',
    ringing: 'ringing',
    answered: 'connected',
    connected: 'connected',
    completed: 'completed',
    hangup: 'completed',
    failed: 'failed',
    busy: 'failed',
    'no-answer': 'failed',
    'no_answer': 'failed',
    transferred: 'transferred',
  };

  const next = map[status] as CallStatus | undefined;
  if (!next) {
    await query(
      `INSERT INTO crm.webhook_events (workspace_id, provider, event_key, payload, status)
       VALUES ($1,'telephony',$2,$3::jsonb,'ignored')`,
      [workspaceId, body.id || `${callId}-${status}`, JSON.stringify(body)],
    );
    return { ignored: true };
  }

  const patch: Record<string, unknown> = {
    meta: { ivr: body },
  };
  if (body.recording_url) patch.meta = { ...(patch.meta as object), recording_url: body.recording_url };
  if (body.transcript) patch.transcript = body.transcript;
  if (body.summary) patch.summary = body.summary;
  if (body.disposition) patch.disposition = body.disposition;
  if (['completed', 'failed', 'transferred'].includes(next)) patch.endedAt = new Date().toISOString();
  if (['connected', 'dialing'].includes(next)) patch.startedAt = new Date().toISOString();

  // recording_url column update via separate query if present
  const updated = await transitionCall(callId, next, patch);
  if (body.recording_url) {
    await query(`UPDATE crm.voice_calls SET recording_url=$2 WHERE id=$1`, [callId, body.recording_url]);
  }
  if (next === 'completed' || next === 'transferred') {
    const call = (await query(`SELECT * FROM crm.voice_calls WHERE id=$1`, [callId])).rows[0];
    if (call) {
      await query(
        `UPDATE crm.leads SET ai_calling_status=$2, updated_at=NOW() WHERE id=$1`,
        [call.lead_id, next === 'transferred' ? 'transferred' : 'completed'],
      );
      const { pushLeadToZoho } = await import('./zoho');
      const lead = (await query(`SELECT * FROM crm.leads WHERE id=$1`, [call.lead_id])).rows[0];
      if (lead) await pushLeadToZoho(workspaceId, lead).catch(() => null);
      if (next === 'transferred' || body.request_human) {
        await query(
          `INSERT INTO crm.tasks (workspace_id, lead_id, title, priority, status, due_at)
           VALUES ($1,$2,'Human takeover after AI/IVR call','high','open', NOW() + INTERVAL '2 hours')`,
          [workspaceId, call.lead_id],
        );
      }
    }
  }
  return { updated };
}
