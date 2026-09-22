import { createHmac, createHash } from 'node:crypto';
import type { MessageStatus, MetaTemplateStatus } from './types';

export type NormalizedWebhookEvent = {
  eventKey: string;
  eventType: string;
  wabaId?: string;
  phoneNumberId?: string;
  displayPhone?: string;
  wamid?: string;
  contactPhone?: string;
  contactName?: string;
  messageStatus?: MessageStatus;
  messageType?: string;
  text?: string;
  timestamp?: string;
  quality?: string;
  templateName?: string;
  templateLanguage?: string;
  templateStatus?: string;
  internalTemplateStatus?: string;
  errorCode?: string;
  errorMessage?: string;
};

export function verifyMetaSignature(rawBody: string, signatureHeader: string | null, appSecret?: string) {
  if (!appSecret) return false;
  if (!signatureHeader?.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
  const received = signatureHeader.slice('sha256='.length);
  try {
    return timingSafeEqualHex(expected, received);
  } catch {
    return false;
  }
}

function timingSafeEqualHex(a: string, b: string) {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  if (left.length !== right.length) return false;
  let out = 0;
  for (let i = 0; i < left.length; i += 1) out |= left[i] ^ right[i];
  return out === 0;
}

export function webhookEventKey(payload: unknown, fallbackRaw: string) {
  const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return createHash('sha256').update(raw).digest('hex');
}

export function normalizeWebhookPayload(payload: Record<string, unknown>): NormalizedWebhookEvent[] {
  const events: NormalizedWebhookEvent[] = [];
  const entries = (payload.entry as Record<string, unknown>[]) || [];
  for (const entry of entries) {
    const wabaId = String(entry.id || '');
    const changes = (entry.changes as Record<string, unknown>[]) || [];
    for (const change of changes) {
      const field = String(change.field || 'unknown');
      const value = (change.value || {}) as Record<string, unknown>;
      const metadata = (value.metadata || {}) as { phone_number_id?: string; display_phone_number?: string };
      const phoneNumberId = metadata.phone_number_id;
      const displayPhone = metadata.display_phone_number;
      const contacts = (value.contacts as { wa_id?: string; profile?: { name?: string } }[]) || [];

      for (const message of (value.messages as Record<string, unknown>[]) || []) {
        const from = String(message.from || '');
        const wamid = String(message.id || '');
        events.push({
          eventKey: wamid || webhookEventKey(message, ''),
          eventType: 'message.inbound',
          wabaId,
          phoneNumberId,
          displayPhone,
          wamid,
          contactPhone: from,
          contactName: contacts.find((c) => c.wa_id === from)?.profile?.name,
          messageStatus: 'RECEIVED',
          messageType: String(message.type || 'text'),
          text: extractText(message),
          timestamp: String(message.timestamp || ''),
        });
      }

      for (const status of (value.statuses as Record<string, unknown>[]) || []) {
        const wamid = String(status.id || '');
        const mapped = mapMessageStatus(String(status.status || ''));
        const firstError = ((status.errors as Record<string, unknown>[]) || [])[0] || {};
        events.push({
          eventKey: `${wamid}:${mapped}:${status.timestamp || ''}`,
          eventType: `message.${mapped.toLowerCase()}`,
          wabaId,
          phoneNumberId,
          displayPhone,
          wamid,
          contactPhone: String(status.recipient_id || ''),
          messageStatus: mapped,
          timestamp: String(status.timestamp || ''),
          errorCode: firstError.code != null ? String(firstError.code) : undefined,
          errorMessage: String(firstError.title || firstError.message || ''),
        });
      }

      if (field === 'message_template_status_update' || value.event === 'TEMPLATE_STATUS_UPDATE' || value.message_template_id) {
        const status = String(value.event || value.message_template_status || value.status || '').toUpperCase() as MetaTemplateStatus;
        events.push({
          eventKey: webhookEventKey({ field, value }, ''),
          eventType: 'template.status',
          wabaId,
          templateName: String(value.message_template_name || value.name || ''),
          templateLanguage: String(value.message_template_language || value.language || ''),
          templateStatus: status,
          internalTemplateStatus: mapMetaTemplateStatus(status),
          errorMessage: String(value.reason || value.rejected_reason || ''),
        });
      }

      if (field === 'phone_number_quality_update' || value.current_limit || value.event === 'PHONE_NUMBER_QUALITY_UPDATE') {
        events.push({
          eventKey: webhookEventKey({ field, value }, ''),
          eventType: 'phone.quality',
          wabaId,
          phoneNumberId: String(value.phone_number_id || phoneNumberId || ''),
          displayPhone,
          quality: String(value.current_limit || value.quality_score || value.quality_rating || 'UNKNOWN').toUpperCase(),
        });
      }

      if (field === 'phone_number_name_update') {
        events.push({
          eventKey: webhookEventKey({ field, value }, ''),
          eventType: 'phone.name',
          wabaId,
          phoneNumberId,
          displayPhone,
          contactName: String(value.display_phone_number || value.verified_name || ''),
        });
      }

      if (field === 'account_update' || field === 'account_review_update') {
        events.push({
          eventKey: webhookEventKey({ field, value }, ''),
          eventType: field === 'account_review_update' ? 'account.review' : 'account.update',
          wabaId,
        });
      }
    }
  }
  return events;
}

function mapMetaTemplateStatus(status?: string | null) {
  const value = (status || '').toUpperCase();
  const map: Record<string, string> = {
    APPROVED: 'META_APPROVED',
    PENDING: 'META_PENDING',
    REJECTED: 'META_REJECTED',
    FLAGGED: 'META_FLAGGED',
    DISABLED: 'META_DISABLED',
    DELETED: 'DELETED',
    REINSTATED: 'META_APPROVED',
    IN_APPEAL: 'META_PENDING',
    PENDING_DELETION: 'DELETED',
  };
  return map[value] || 'META_PENDING';
}

function extractText(message: Record<string, unknown>) {
  if (message.type === 'text') return String((message.text as { body?: string })?.body || '');
  if (message.type === 'button') return String((message.button as { text?: string })?.text || '');
  if (message.type === 'interactive') {
    const interactive = message.interactive as { button_reply?: { title?: string }; list_reply?: { title?: string } };
    return interactive?.button_reply?.title || interactive?.list_reply?.title || '';
  }
  return '';
}

export function mapMessageStatus(status: string): MessageStatus {
  const value = status.toLowerCase();
  if (value === 'sent') return 'SENT';
  if (value === 'delivered') return 'DELIVERED';
  if (value === 'read') return 'READ';
  if (value === 'failed') return 'FAILED';
  return 'QUEUED';
}

const STATUS_RANK: Record<string, number> = {
  QUEUED: 0,
  SENT: 1,
  DELIVERED: 2,
  READ: 3,
  FAILED: 4,
  RECEIVED: 5,
};

export function shouldAdvanceMessageStatus(current: string | null | undefined, next: string, currentTs?: string | null, nextTs?: string | null) {
  if (next === 'FAILED') return true;
  if (current === 'FAILED' && next !== 'FAILED') {
    if (currentTs && nextTs && Number(nextTs) < Number(currentTs)) return false;
  }
  if (current === 'READ' && next !== 'FAILED') return false;
  if ((STATUS_RANK[next] ?? 0) >= (STATUS_RANK[current || 'QUEUED'] ?? 0)) return true;
  if (nextTs && currentTs && Number(nextTs) >= Number(currentTs) && STATUS_RANK[next] > 0) return true;
  return false;
}
