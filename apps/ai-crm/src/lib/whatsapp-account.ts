import { ensureEnv } from './env';

export function whatsAppEnv() {
  ensureEnv();
  const version = (process.env.WHATSAPP_API_VERSION || process.env.META_GRAPH_API_VERSION || 'v21.0').replace(/^\//, '');
  return {
    token: process.env.CRM_WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneId: process.env.CRM_WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    wabaId: process.env.CRM_WHATSAPP_BUSINESS_ACCOUNT_ID || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    template: process.env.CRM_WHATSAPP_TEMPLATE_NAME || process.env.WHATSAPP_TEMPLATE_NAME || '',
    language: process.env.CRM_WHATSAPP_TEMPLATE_LANGUAGE || process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en',
    version,
  };
}

async function graph(path: string) {
  const cfg = whatsAppEnv();
  const res = await fetch(`https://graph.facebook.com/${cfg.version}/${path}`, {
    headers: { Authorization: `Bearer ${cfg.token}` },
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, json };
}

export async function inspectWhatsAppAccount() {
  const cfg = whatsAppEnv();
  if (!cfg.token || cfg.token.endsWith('>') || cfg.token.length < 180 || !cfg.phoneId || !cfg.wabaId) {
    return { ok: false as const, reason: 'WhatsApp token is missing or truncated.' };
  }
  const [phone, account, templates] = await Promise.all([
    graph(`${cfg.phoneId}?fields=verified_name,quality_rating,code_verification_status,display_phone_number`),
    graph(`${cfg.wabaId}?fields=name,account_review_status`),
    graph(`${cfg.wabaId}/message_templates?fields=name,status,language&limit=50`),
  ]);
  if (!phone.ok) return { ok: false as const, reason: phone.json?.error?.message || 'Meta rejected the token.' };
  const list = Array.isArray(templates.json?.data) ? templates.json.data : [];
  const opening = list.find((item: { name?: string }) => item.name === cfg.template);
  return {
    ok: true as const,
    phone: {
      verifiedName: phone.json.verified_name || '',
      quality: phone.json.quality_rating || '',
      code: phone.json.code_verification_status || '',
    },
    account: {
      name: account.json?.name || '',
      review: account.json?.account_review_status || '',
    },
    template: opening ? { name: opening.name, status: opening.status, language: opening.language } : null,
  };
}
