import { after } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMetaProviderConfig } from '../config';
import { createAlert, notify } from '../audit';
import { normalizeWebhookPayload, verifyMetaSignature, webhookEventKey, shouldAdvanceMessageStatus } from '../webhook-parser';
import { refreshClientHealth } from './clients';

export function verifyProviderWebhook(mode: string | null, token: string | null, challenge: string | null) {
  const expected = getMetaProviderConfig().webhookVerifyToken;
  if (mode === 'subscribe' && expected && token === expected && challenge) return challenge;
  return null;
}

export async function ingestWebhook(rawBody: string, signature: string | null) {
  const cfg = getMetaProviderConfig();
  const signatureValid = verifyMetaSignature(rawBody, signature, cfg.appSecret);
  if (!signatureValid) {
    return { ok: false, status: 401, error: 'Invalid signature' };
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return { ok: false, status: 400, error: 'Invalid JSON' };
  }

  const eventKey = webhookEventKey(payload, rawBody);
  const supabase = createAdminClient();
  const existing = await supabase.from('wa_webhook_events').select('id,processing_status').eq('event_key', eventKey).maybeSingle();
  if (existing.data) {
    return { ok: true, status: 200, duplicate: true };
  }

  const first = normalizeWebhookPayload(payload)[0];
  const clientId = first ? await resolveClientId(first.wabaId, first.phoneNumberId) : null;
  const { data: inserted, error } = await supabase
    .from('wa_webhook_events')
    .insert({
      client_id: clientId,
      waba_id: first?.wabaId || null,
      phone_number_id: first?.phoneNumberId || null,
      event_key: eventKey,
      event_type: first?.eventType || 'unknown',
      payload_json: payload,
      signature_valid: true,
      processing_status: 'RECEIVED',
    })
    .select('id')
    .single();
  if (error) {
    if (/duplicate|unique/i.test(error.message)) return { ok: true, status: 200, duplicate: true };
    return { ok: false, status: 500, error: error.message };
  }

  after(() => processWebhookEvent(inserted.id));
  return { ok: true, status: 200 };
}

export async function processWebhookEvent(eventId: string) {
  const supabase = createAdminClient();
  const { data: event } = await supabase.from('wa_webhook_events').select('*').eq('id', eventId).maybeSingle();
  if (!event) return;
  if (event.processing_status === 'PROCESSED' || event.processing_status === 'DUPLICATE') return;

  await supabase.from('wa_webhook_events').update({ processing_status: 'PROCESSING', attempts: (event.attempts || 0) + 1 }).eq('id', eventId);
  try {
    const normalized = normalizeWebhookPayload(event.payload_json || {});
    for (const item of normalized) {
      await applyNormalizedEvent(item, event.id);
    }
    await supabase
      .from('wa_webhook_events')
      .update({ processing_status: 'PROCESSED', processed_at: new Date().toISOString(), normalized_json: normalized })
      .eq('id', eventId);
  } catch (err) {
    await supabase
      .from('wa_webhook_events')
      .update({ processing_status: 'FAILED', error_message: err instanceof Error ? err.message : 'Processor failed' })
      .eq('id', eventId);
  }
}

async function resolveClientId(wabaId?: string, phoneNumberId?: string) {
  const supabase = createAdminClient();
  if (wabaId) {
    const { data } = await supabase.from('wa_business_accounts').select('client_id').eq('waba_id', wabaId).maybeSingle();
    if (data?.client_id) return data.client_id as string;
  }
  if (phoneNumberId) {
    const { data } = await supabase.from('wa_phone_numbers').select('client_id').eq('phone_number_id', phoneNumberId).maybeSingle();
    if (data?.client_id) return data.client_id as string;
  }
  return null;
}

async function applyNormalizedEvent(event: ReturnType<typeof normalizeWebhookPayload>[number], webhookEventId: string) {
  const supabase = createAdminClient();
  const clientId = await resolveClientId(event.wabaId, event.phoneNumberId);

  if (event.eventType.startsWith('message.') && event.wamid) {
    await applyMessageEvent(event, clientId, webhookEventId);
  }

  if (event.eventType === 'template.status' && event.templateName) {
    let query = supabase.from('wa_templates').update({
      meta_status: event.templateStatus,
      internal_status: event.internalTemplateStatus,
      rejection_reason: event.errorMessage || null,
      meta_approved_at: event.internalTemplateStatus === 'META_APPROVED' ? new Date().toISOString() : null,
    }).eq('name', event.templateName);
    if (event.templateLanguage) query = query.eq('language', event.templateLanguage);
    if (event.wabaId) query = query.eq('waba_id', event.wabaId);
    await query;
    if (event.internalTemplateStatus === 'META_REJECTED') {
      await createAlert({ clientId, type: 'TEMPLATE_REJECTED', severity: 'WARNING', title: `Template rejected: ${event.templateName}`, description: event.errorMessage });
      await notify({ clientId, type: 'template.rejected', title: `Template rejected: ${event.templateName}` });
    }
    if (event.internalTemplateStatus === 'META_APPROVED') {
      await notify({ clientId, type: 'template.approved', title: `Template approved: ${event.templateName}` });
    }
    if (event.internalTemplateStatus === 'META_FLAGGED') {
      await createAlert({ clientId, type: 'TEMPLATE_FLAGGED', severity: 'WARNING', title: `Template flagged: ${event.templateName}` });
    }
    if (event.internalTemplateStatus === 'META_DISABLED') {
      await createAlert({ clientId, type: 'TEMPLATE_DISABLED', severity: 'CRITICAL', title: `Template disabled: ${event.templateName}` });
    }
  }

  if (event.eventType === 'phone.quality' && event.phoneNumberId) {
    const { data: phone } = await supabase.from('wa_phone_numbers').select('*').eq('phone_number_id', event.phoneNumberId).maybeSingle();
    if (phone) {
      const next = (event.quality || 'UNKNOWN').toUpperCase();
      if (phone.quality_rating !== next) {
        await supabase.from('wa_phone_quality_history').insert({
          phone_number_id: phone.id,
          previous_quality: phone.quality_rating,
          new_quality: next,
          event: 'WEBHOOK',
          meta_event_id: webhookEventId,
        });
        await supabase.from('wa_phone_numbers').update({ quality_rating: next }).eq('id', phone.id);
        if (['YELLOW', 'RED'].includes(next)) {
          await createAlert({
            clientId: phone.client_id,
            resourceType: 'phone',
            resourceId: phone.id,
            type: 'QUALITY_DOWNGRADE',
            severity: next === 'RED' ? 'CRITICAL' : 'WARNING',
            title: `Phone quality changed ${phone.quality_rating || 'UNKNOWN'} → ${next}`,
          });
          await notify({ clientId: phone.client_id, type: 'quality.downgrade', title: `Quality ${phone.quality_rating} → ${next}` });
        }
      }
    }
  }

  if (event.eventType.startsWith('account.')) {
    await createAlert({
      clientId,
      type: 'ACCOUNT_FLAGGED',
      severity: 'WARNING',
      title: 'WhatsApp account update received',
      description: event.eventType,
    });
  }

  if (clientId) await refreshClientHealth(clientId);
}

async function applyMessageEvent(event: ReturnType<typeof normalizeWebhookPayload>[number], clientId: string | null, webhookEventId: string) {
  const supabase = createAdminClient();
  const { data: existing } = await supabase.from('wa_messages').select('*').eq('wamid', event.wamid).maybeSingle();
  const phoneRow = event.phoneNumberId
    ? (await supabase.from('wa_phone_numbers').select('id,client_id').eq('phone_number_id', event.phoneNumberId).maybeSingle()).data
    : null;
  const resolvedClient = clientId || phoneRow?.client_id || null;
  let contactId: string | null = null;
  if (resolvedClient && event.contactPhone) {
    const existingContact = await supabase.from('wa_contacts').select('id').eq('client_id', resolvedClient).eq('phone', event.contactPhone).maybeSingle();
    if (existingContact.data?.id) contactId = existingContact.data.id;
    else {
      const inserted = await supabase
        .from('wa_contacts')
        .insert({ client_id: resolvedClient, phone: event.contactPhone, name: event.contactName || null, last_interaction_at: new Date().toISOString() })
        .select('id')
        .single();
      contactId = inserted.data?.id || null;
    }
  }

  const ts = event.timestamp ? new Date(Number(event.timestamp) * 1000).toISOString() : new Date().toISOString();
  if (!existing) {
    const { data: created } = await supabase
      .from('wa_messages')
      .insert({
        client_id: resolvedClient,
        waba_id: event.wabaId || null,
        phone_number_id: phoneRow?.id || null,
        contact_id: contactId,
        wamid: event.wamid,
        direction: event.messageStatus === 'RECEIVED' ? 'INBOUND' : 'OUTBOUND',
        type: event.messageType || 'text',
        status: event.messageStatus || 'QUEUED',
        content_json: { text: event.text || '' },
        error_code: event.errorCode || null,
        error_message: event.errorMessage || null,
        sent_at: event.messageStatus === 'SENT' ? ts : null,
        delivered_at: event.messageStatus === 'DELIVERED' ? ts : null,
        read_at: event.messageStatus === 'READ' ? ts : null,
        failed_at: event.messageStatus === 'FAILED' ? ts : null,
        received_at: event.messageStatus === 'RECEIVED' ? ts : null,
      })
      .select('id')
      .single();
    if (created?.id) {
      await supabase.from('wa_message_status_history').insert({
        message_id: created.id,
        status: event.messageStatus,
        meta_timestamp: ts,
        payload_reference: webhookEventId,
      });
      if (event.messageStatus === 'RECEIVED' && resolvedClient) {
        await upsertConversation(resolvedClient, contactId, phoneRow?.id || null, event.text || '');
      }
    }
    return;
  }

  if (!shouldAdvanceMessageStatus(existing.status, event.messageStatus || existing.status, existing.created_at, ts)) {
    await supabase.from('wa_message_status_history').insert({
      message_id: existing.id,
      status: event.messageStatus,
      meta_timestamp: ts,
      payload_reference: webhookEventId,
    });
    return;
  }

  const patch: Record<string, unknown> = { status: event.messageStatus };
  if (event.messageStatus === 'SENT') patch.sent_at = existing.sent_at || ts;
  if (event.messageStatus === 'DELIVERED') patch.delivered_at = existing.delivered_at || ts;
  if (event.messageStatus === 'READ') patch.read_at = existing.read_at || ts;
  if (event.messageStatus === 'FAILED') {
    patch.failed_at = ts;
    patch.error_code = event.errorCode || existing.error_code;
    patch.error_message = event.errorMessage || existing.error_message;
  }
  await supabase.from('wa_messages').update(patch).eq('id', existing.id);
  await supabase.from('wa_message_status_history').insert({
    message_id: existing.id,
    status: event.messageStatus,
    meta_timestamp: ts,
    payload_reference: webhookEventId,
  });
}

async function upsertConversation(clientId: string, contactId: string | null, phoneId: string | null, preview: string) {
  const supabase = createAdminClient();
  if (!contactId) return;
  const existing = await supabase.from('wa_conversations').select('id,unread_count').eq('client_id', clientId).eq('contact_id', contactId).maybeSingle();
  if (existing.data?.id) {
    await supabase
      .from('wa_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: preview.slice(0, 180),
        unread_count: (existing.data.unread_count || 0) + 1,
        status: 'OPEN',
      })
      .eq('id', existing.data.id);
    return;
  }
  await supabase.from('wa_conversations').insert({
    client_id: clientId,
    contact_id: contactId,
    phone_number_id: phoneId,
    status: 'OPEN',
    unread_count: 1,
    last_message_at: new Date().toISOString(),
    last_message_preview: preview.slice(0, 180),
  });
}

export function maskWebhookPayload(payload: unknown): unknown {
  if (payload == null) return payload;
  if (typeof payload === 'string') return payload;
  if (Array.isArray(payload)) return payload.map(maskWebhookPayload);
  if (typeof payload === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (/token|secret|pin|authorization|access_token/i.test(key)) out[key] = '***';
      else out[key] = maskWebhookPayload(value);
    }
    return out;
  }
  return payload;
}
