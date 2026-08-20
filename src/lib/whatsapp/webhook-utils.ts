import crypto from 'crypto';
import type { InboundWhatsAppMessage } from './types';

export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null, appSecret?: string): boolean {
  if (!appSecret) return true;
  if (!signatureHeader?.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
  const received = signatureHeader.slice('sha256='.length);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
  } catch {
    return false;
  }
}

export function parseInboundMessages(payload: Record<string, unknown>): InboundWhatsAppMessage[] {
  const results: InboundWhatsAppMessage[] = [];
  const entries = (payload.entry as { changes?: { value?: Record<string, unknown> }[] }[]) || [];

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const messages = (value.messages as Record<string, unknown>[]) || [];
      const contacts = (value.contacts as { profile?: { name?: string }; wa_id?: string }[]) || [];

      for (const message of messages) {
        const from = String(message.from || '');
        const id = String(message.id || '');
        if (!from || !id) continue;

        const type = String(message.type || 'unknown');
        const profile = contacts.find((c) => c.wa_id === from)?.profile?.name;
        let text: string | undefined;
        let media_id: string | undefined;
        let media_mime_type: string | undefined;

        if (type === 'text') {
          text = String((message.text as { body?: string })?.body || '');
        } else if (type === 'interactive') {
          const interactive = message.interactive as {
            button_reply?: { title?: string };
            list_reply?: { title?: string };
          };
          text = interactive?.button_reply?.title || interactive?.list_reply?.title || '[Interactive response]';
        } else if (['image', 'document', 'audio', 'video'].includes(type)) {
          const media = message[type] as { id?: string; mime_type?: string };
          media_id = media?.id;
          media_mime_type = media?.mime_type;
        }

        results.push({
          whatsapp_message_id: id,
          from,
          timestamp: String(message.timestamp || ''),
          type,
          text,
          profile_name: profile,
          media_id,
          media_mime_type,
          raw: message,
        });
      }
    }
  }

  return results;
}

export function parseStatusUpdates(payload: Record<string, unknown>) {
  const entries = (payload.entry as { changes?: { value?: { statuses?: Record<string, unknown>[] } }[] }[]) || [];
  return entries.flatMap((entry) => entry.changes?.flatMap((change) => change.value?.statuses || []) || []);
}
