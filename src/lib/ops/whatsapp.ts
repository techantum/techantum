import { assertClientSafeMessage } from './messages';
import { isValidWhatsAppNumber, whatsappApiTo } from './phone';

const GRAPH_BASE = 'https://graph.facebook.com';
const TEMPLATE_NAME = 'techantum_client_update';
const TEMPLATE_LANGUAGE = 'en';
const TEMPLATE_CACHE_MS = 30_000;

export type WhatsAppSendResult = {
  ok: boolean;
  status: 'sent' | 'failed';
  provider_message_id: string | null;
  error_message: string | null;
};

export type WhatsAppDeliveryInfo = {
  configured: boolean;
  from_number: string | null;
  template_name: string;
  template_status: string | null;
  can_deliver: boolean;
  warning: string | null;
};

type GraphError = {
  message?: string;
  code?: number;
  error_subcode?: number;
  type?: string;
  error_user_msg?: string;
  error_data?: { details?: string };
};

type TemplateRow = {
  name?: string;
  language?: string;
  status?: string;
  rejected_reason?: string | null;
};

let templateCache: { expires: number; rows: TemplateRow[] } | null = null;
let fromNumberCache: { expires: number; value: string | null } | null = null;

function getConfig() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim();
  const version = process.env.WHATSAPP_API_VERSION?.trim() || 'v21.0';
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME?.trim() || TEMPLATE_NAME;
  const templateLanguage = process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || TEMPLATE_LANGUAGE;
  return {
    token,
    phoneNumberId,
    wabaId,
    version,
    templateName,
    templateLanguage,
    configured: Boolean(token && phoneNumberId && wabaId),
  };
}

export function isWhatsAppConfigured() {
  return getConfig().configured;
}

async function graphGet<T>(path: string): Promise<{ ok: boolean; status: number; json: T }> {
  const { token, version } = getConfig();
  const res = await fetch(`${GRAPH_BASE}/${version}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const json = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, json };
}

async function listTemplates(): Promise<TemplateRow[]> {
  const now = Date.now();
  if (templateCache && templateCache.expires > now) return templateCache.rows;
  const { wabaId } = getConfig();
  if (!wabaId) return [];
  const result = await graphGet<{ data?: TemplateRow[] }>(`${wabaId}/message_templates?limit=100`);
  const rows = result.ok ? result.json.data || [] : [];
  templateCache = { expires: now + TEMPLATE_CACHE_MS, rows };
  return rows;
}

async function getFromNumber(): Promise<string | null> {
  const now = Date.now();
  if (fromNumberCache && fromNumberCache.expires > now) return fromNumberCache.value;
  const { phoneNumberId } = getConfig();
  if (!phoneNumberId) return null;
  const result = await graphGet<{ display_phone_number?: string }>(
    `${phoneNumberId}?fields=display_phone_number`,
  );
  const value = result.ok ? result.json.display_phone_number || null : null;
  fromNumberCache = { expires: now + 5 * 60_000, value };
  return value;
}

function pickTemplate(rows: TemplateRow[], name: string, language: string) {
  return (
    rows.find((row) => row.name === name && (row.language === language || row.language?.startsWith(language))) ||
    rows.find((row) => row.name === name) ||
    null
  );
}

export async function getWhatsAppDeliveryInfo(): Promise<WhatsAppDeliveryInfo> {
  const { configured, templateName, templateLanguage } = getConfig();
  if (!configured) {
    return {
      configured: false,
      from_number: null,
      template_name: templateName,
      template_status: null,
      can_deliver: false,
      warning: 'WhatsApp is not configured on the server.',
    };
  }

  const [fromNumber, templates] = await Promise.all([getFromNumber(), listTemplates()]);
  const template = pickTemplate(templates, templateName, templateLanguage);
  const status = template?.status || 'MISSING';
  const canDeliver = status === 'APPROVED';
  let warning: string | null = null;
  if (status === 'PENDING') {
    warning =
      `WhatsApp will not deliver this until Meta approves template "${templateName}" ` +
      `(currently PENDING). Free-form chat is only delivered after the client messages ${fromNumber || 'your business number'} first. ` +
      'The green “sent” status was Graph accepting the request, not delivery.';
  } else if (status === 'REJECTED' || status === 'PAUSED' || status === 'DISABLED') {
    warning =
      `Template "${templateName}" is ${status}` +
      (template?.rejected_reason ? ` (${template.rejected_reason})` : '') +
      '. Approve a utility template in WhatsApp Manager, then send again.';
  } else if (status === 'MISSING') {
    warning = `Template "${templateName}" was not found on this WhatsApp account.`;
  }

  return {
    configured: true,
    from_number: fromNumber,
    template_name: templateName,
    template_status: status,
    can_deliver: canDeliver,
    warning,
  };
}

function formatGraphSendError(error: GraphError | undefined, phoneNumberId: string | undefined): string | null {
  const details = error?.error_data?.details?.trim() || error?.error_user_msg?.trim();
  const message = error?.message?.trim();
  if (!message && !details) return null;

  const missingObject =
    error?.error_subcode === 33 ||
    /does not exist, cannot be loaded due to missing permissions/i.test(message || '');
  if (missingObject) {
    return (
      `WhatsApp rejected Phone Number ID ${phoneNumberId || '(missing)'}. ` +
      'Use the Phone number ID from WhatsApp → API Setup, not the App ID or WABA ID.'
    );
  }

  if (error?.code === 131047) {
    return 'WhatsApp blocked this as a session message. The client has not messaged you in the last 24 hours, so an approved template is required.';
  }
  if (error?.code === 131030) {
    return details || 'Recipient is not on the WhatsApp test allowlist. Add and OTP-verify the number in API Setup, or use a live business number.';
  }
  if (error?.code === 131042) {
    return 'WhatsApp billing is not set up for this number. Add a payment method in WhatsApp Manager.';
  }
  if (error?.code === 132001 || error?.code === 132015) {
    return details || message || 'That WhatsApp template is not approved yet.';
  }

  return [message, details].filter(Boolean).join(' — ');
}

export async function sendWhatsAppText(to: string, body: string): Promise<WhatsAppSendResult> {
  assertClientSafeMessage(body);
  if (!isValidWhatsAppNumber(to)) {
    throw new Error('A valid WhatsApp number is required.');
  }

  const { token, phoneNumberId, version, configured, templateName, templateLanguage } = getConfig();
  if (!configured) {
    return {
      ok: false,
      status: 'failed',
      provider_message_id: null,
      error_message:
        'WhatsApp is not configured. Add WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, and WHATSAPP_BUSINESS_ACCOUNT_ID, then restart.',
    };
  }

  const delivery = await getWhatsAppDeliveryInfo();
  if (!delivery.can_deliver) {
    return {
      ok: false,
      status: 'failed',
      provider_message_id: null,
      error_message:
        delivery.warning ||
        'WhatsApp cannot deliver this message yet. Wait for the utility template to be approved, then send again.',
    };
  }

  const parameter = body.trim().replace(/\s+/g, ' ').slice(0, 1024);
  const res = await fetch(`${GRAPH_BASE}/${version}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: whatsappApiTo(to),
      type: 'template',
      template: {
        name: templateName,
        language: { code: templateLanguage },
        components: [
          {
            type: 'body',
            parameters: [{ type: 'text', text: parameter }],
          },
        ],
      },
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as {
    messages?: { id?: string; message_status?: string }[];
    error?: GraphError;
  };

  if (!res.ok) {
    templateCache = null;
    return {
      ok: false,
      status: 'failed',
      provider_message_id: null,
      error_message: formatGraphSendError(payload.error, phoneNumberId) || `WhatsApp send failed (${res.status}).`,
    };
  }

  return {
    ok: true,
    status: 'sent',
    provider_message_id: payload.messages?.[0]?.id ?? null,
    error_message: null,
  };
}

export async function applyWhatsAppStatusUpdate(input: {
  provider_message_id: string;
  status: string;
  error_message?: string | null;
}) {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const mapped =
    input.status === 'delivered' || input.status === 'read'
      ? 'delivered'
      : input.status === 'failed'
        ? 'failed'
        : input.status === 'sent'
          ? 'sent'
          : null;
  if (!mapped) return;
  const update: Record<string, string | null> = { status: mapped };
  if (input.error_message) update.error_message = input.error_message;
  if (mapped === 'delivered') update.sent_at = new Date().toISOString();
  await createAdminClient()
    .from('ops_client_communications')
    .update(update)
    .eq('provider_message_id', input.provider_message_id);
}
