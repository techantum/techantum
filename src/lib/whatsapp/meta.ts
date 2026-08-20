import { getWhatsAppAiConfig } from './config';
import { verifyWebhookSignature as verifySig } from './webhook-utils';
import { whatsappApiTo } from '@/lib/ops/phone';

const GRAPH_BASE = 'https://graph.facebook.com';

export type SessionSendResult = {
  ok: boolean;
  provider_message_id: string | null;
  error_message: string | null;
};

export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const { appSecret } = getWhatsAppAiConfig();
  return verifySig(rawBody, signatureHeader, appSecret || undefined);
}

export async function sendWhatsAppSessionText(to: string, body: string): Promise<SessionSendResult> {
  const { accessToken, phoneNumberId, graphVersion, configured } = getWhatsAppAiConfig();
  if (!configured) {
    return { ok: false, provider_message_id: null, error_message: 'WhatsApp is not configured on the server.' };
  }

  const text = body.trim().slice(0, 4096);
  if (!text) {
    return { ok: false, provider_message_id: null, error_message: 'Empty message.' };
  }

  const res = await fetch(`${GRAPH_BASE}/${graphVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: whatsappApiTo(to),
      type: 'text',
      text: { body: text },
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as {
    messages?: { id?: string }[];
    error?: { message?: string };
  };

  if (!res.ok) {
    return {
      ok: false,
      provider_message_id: null,
      error_message: payload.error?.message || `WhatsApp send failed (${res.status}).`,
    };
  }

  return {
    ok: true,
    provider_message_id: payload.messages?.[0]?.id ?? null,
    error_message: null,
  };
}

export async function applyWhatsAppMessageStatusUpdate(input: {
  provider_message_id: string;
  status: string;
  error_message?: string | null;
}) {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const mapped =
    input.status === 'delivered' || input.status === 'read'
      ? 'DELIVERED'
      : input.status === 'failed'
        ? 'FAILED'
        : input.status === 'sent'
          ? 'SENT'
          : null;
  if (!mapped) return;

  const update: Record<string, string | null> = { delivery_status: mapped };
  if (input.error_message) update.error_message = input.error_message;

  const supabase = createAdminClient();
  await supabase.from('whatsapp_messages').update(update).eq('whatsapp_message_id', input.provider_message_id);
  await supabase
    .from('ops_client_communications')
    .update({
      status: mapped === 'DELIVERED' ? 'delivered' : mapped === 'FAILED' ? 'failed' : 'sent',
      error_message: input.error_message || null,
    })
    .eq('provider_message_id', input.provider_message_id);
}
