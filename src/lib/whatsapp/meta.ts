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

async function postWhatsAppMessage(body: Record<string, unknown>): Promise<SessionSendResult> {
  const { accessToken, phoneNumberId, graphVersion, configured } = getWhatsAppAiConfig();
  if (!configured) {
    return { ok: false, provider_message_id: null, error_message: 'WhatsApp is not configured on the server.' };
  }
  const res = await fetch(`${GRAPH_BASE}/${graphVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
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

export async function sendWhatsAppButtons(
  to: string,
  body: string,
  buttons: { id: string; title: string }[]
): Promise<SessionSendResult> {
  const text = body.trim().slice(0, 1024);
  const actionButtons = buttons.slice(0, 3).map((button) => ({
    type: 'reply',
    reply: { id: button.id.slice(0, 256), title: button.title.slice(0, 20) },
  }));
  if (!text || actionButtons.length === 0) {
    return { ok: false, provider_message_id: null, error_message: 'Empty interactive message.' };
  }

  const result = await postWhatsAppMessage({
    messaging_product: 'whatsapp',
    to: whatsappApiTo(to),
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text },
      action: { buttons: actionButtons },
    },
  });

  if (result.ok) return result;

  const numbered = `${text}\n\n${buttons.map((button, index) => `${index + 1}) ${button.title}`).join('\n')}`;
  return sendWhatsAppSessionText(to, numbered);
}

export async function sendWhatsAppList(
  to: string,
  body: string,
  list: { button: string; sections: { title: string; rows: { id: string; title: string; description?: string }[] }[] }
): Promise<SessionSendResult> {
  const text = body.trim().slice(0, 1024);
  const sections = (list.sections || [])
    .map((section) => ({
      title: section.title.slice(0, 24),
      rows: (section.rows || []).slice(0, 10).map((row) => ({
        id: row.id.slice(0, 200),
        title: row.title.slice(0, 24),
        ...(row.description ? { description: row.description.slice(0, 72) } : {}),
      })),
    }))
    .filter((section) => section.rows.length > 0)
    .slice(0, 10);
  if (!text || sections.length === 0) {
    return { ok: false, provider_message_id: null, error_message: 'Empty list message.' };
  }

  const result = await postWhatsAppMessage({
    messaging_product: 'whatsapp',
    to: whatsappApiTo(to),
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text },
      action: {
        button: (list.button || 'View options').slice(0, 20),
        sections,
      },
    },
  });

  if (result.ok) return result;

  const numbered = `${text}\n\n${sections
    .flatMap((section) => section.rows.map((row, index) => `${index + 1}) ${row.title}`))
    .join('\n')}`;
  return sendWhatsAppSessionText(to, numbered);
}

export async function markWhatsAppReadAndTyping(messageId: string): Promise<void> {
  const { accessToken, phoneNumberId, graphVersion, configured } = getWhatsAppAiConfig();
  if (!configured || !messageId) return;
  try {
    await fetch(`${GRAPH_BASE}/${graphVersion}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
        typing_indicator: { type: 'text' },
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    console.warn('[whatsapp] typing indicator failed', err instanceof Error ? err.message : err);
  }
}

export async function getWhatsAppReceiveHealth() {
  const { accessToken, phoneNumberId, graphVersion, configured } = getWhatsAppAiConfig();
  if (!configured) {
    return {
      receiving: false,
      display_number: null,
      webhook_url: null,
      issues: ['WhatsApp is not configured on the server.'],
    };
  }

  const res = await fetch(
    `${GRAPH_BASE}/${graphVersion}/${phoneNumberId}?fields=display_phone_number,health_status,webhook_configuration`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' }
  );
  const payload = (await res.json().catch(() => ({}))) as {
    display_phone_number?: string;
    webhook_configuration?: { phone_number?: string; application?: string };
    health_status?: {
      entities?: {
        additional_info?: string[];
        errors?: { error_description?: string; possible_solution?: string }[];
      }[];
    };
    error?: { message?: string };
  };

  if (!res.ok) {
    return {
      receiving: false,
      display_number: null,
      webhook_url: null,
      issues: [payload.error?.message || `Could not read WhatsApp health (${res.status}).`],
    };
  }

  const notes =
    payload.health_status?.entities?.flatMap((entity) => [
      ...(entity.additional_info || []),
      ...(entity.errors || []).map((err) => err.error_description || '').filter(Boolean),
    ]) || [];
  const missingWebhook = notes.some((note) => /not subscribed to the message webhook/i.test(note));

  return {
    receiving: !missingWebhook,
    display_number: payload.display_phone_number || null,
    webhook_url:
      payload.webhook_configuration?.phone_number ||
      payload.webhook_configuration?.application ||
      'https://techantum.com/api/webhooks/whatsapp',
    issues: missingWebhook
      ? [
          'Meta is not subscribed to the messages webhook, so inbound chats never reach TechAntum.',
        ]
      : [],
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
