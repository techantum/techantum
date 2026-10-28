import { createHash, randomInt } from 'node:crypto';
import { q } from '@/lib/finance/db';
import { createAuthAdminClient } from '@/lib/supabase/admin';
import { completeOAuthLogin } from './session';
import { composeWhatsAppPhone } from './phone-countries';

const OTP_TTL_MS = 10 * 60 * 1000;

function pepper() {
  return process.env.LOGIN_OTP_PEPPER?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || 'hookooh-login-otp';
}

export function normalizeWhatsAppPhone(raw: string, countryDial?: string) {
  if (countryDial) return composeWhatsAppPhone(raw, countryDial);
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return digits;
  return '';
}

export function phoneLoginEmail(phone: string) {
  return `wa${phone}@otp.hookooh.local`;
}

function hashLoginOtp(phone: string, code: string) {
  return createHash('sha256').update(`${phone}:${code}:${pepper()}`).digest('hex');
}

async function sendWhatsAppCode(phone: string, code: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WHATSAPP_ACCESS_TOKEN || '';
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_WHATSAPP_PHONE_NUMBER_ID || '';
  const version = process.env.WHATSAPP_API_VERSION || 'v21.0';
  const authTemplate = process.env.WHATSAPP_LOGIN_OTP_TEMPLATE?.trim();
  const message = `Your Hookooh login code is ${code}. It expires in 10 minutes. Do not share this code.`;
  if (!token || !phoneId) throw new Error('WhatsApp OTP is not configured. Use Google or email to continue.');
  const template = authTemplate
    ? {
        name: authTemplate,
        language: { code: process.env.WHATSAPP_LOGIN_OTP_TEMPLATE_LANG?.trim() || 'en' },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: code }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
        ],
      }
    : {
        name: process.env.WHATSAPP_TEMPLATE_NAME?.trim() || 'techantum_client_update',
        language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || 'en' },
        components: [{ type: 'body', parameters: [{ type: 'text', text: message }] }],
      };
  const response = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template,
    }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = body.error?.error_user_msg || body.error?.message;
    throw new Error(detail || 'Could not send the WhatsApp code.');
  }
}

export async function sendHookoohOtp(rawPhone: string, countryDial?: string) {
  const phone = normalizeWhatsAppPhone(rawPhone, countryDial);
  if (!phone) throw new Error('Enter a valid WhatsApp number with country code.');
  const recent = await q<{ count: string }>(
    undefined,
    `SELECT COUNT(*)::text AS count FROM hookooh_login_otps WHERE phone=$1 AND created_at > NOW() - INTERVAL '15 minutes'`,
    [phone],
  );
  if (Number(recent.rows[0]?.count || 0) >= 4) throw new Error('Please wait a few minutes before requesting another code.');
  const code = String(randomInt(100000, 999999));
  await q(
    undefined,
    `INSERT INTO hookooh_login_otps (phone, code_hash, expires_at) VALUES ($1,$2,$3)`,
    [phone, hashLoginOtp(phone, code), new Date(Date.now() + OTP_TTL_MS).toISOString()],
  );
  await sendWhatsAppCode(phone, code);
  return { ok: true, phone };
}

async function findOrCreatePhoneUser(phone: string) {
  const email = phoneLoginEmail(phone);
  const existing = await q<{ user_id: string }>(undefined, `SELECT user_id FROM saas_memberships WHERE email=$1 LIMIT 1`, [email]);
  if (existing.rows[0]) return { userId: existing.rows[0].user_id, email };
  const auth = createAuthAdminClient();
  const created = await auth.auth.admin.createUser({
    email,
    email_confirm: true,
    phone: `+${phone}`,
    phone_confirm: true,
    user_metadata: { phone, login_method: 'whatsapp_otp', full_name: 'Hookooh user', app: 'hookooh' },
  });
  const userId = created.data.user?.id;
  if (!userId) {
    const generated = await auth.auth.admin.generateLink({ type: 'magiclink', email });
    const id = generated.data.user?.id;
    if (!id) throw new Error(created.error?.message || 'Could not create your account.');
    return { userId: id, email };
  }
  return { userId, email };
}

export async function verifyHookoohOtp(rawPhone: string, rawCode: string, packageId?: string | null, countryDial?: string) {
  const phone = normalizeWhatsAppPhone(rawPhone, countryDial);
  const code = String(rawCode || '').replace(/\D/g, '');
  if (!phone || code.length !== 6) throw new Error('Enter the 6-digit code sent on WhatsApp.');
  const { rows } = await q<{ id: string; code_hash: string; expires_at: string; attempts: number }>(
    undefined,
    `SELECT id, code_hash, expires_at::text, attempts FROM hookooh_login_otps
     WHERE phone=$1 AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1`,
    [phone],
  );
  const row = rows[0];
  if (!row) throw new Error('No active code found. Please request a new one.');
  if (new Date(row.expires_at).getTime() < Date.now()) throw new Error('That code has expired. Please request a new one.');
  if (row.attempts >= 5) throw new Error('Too many attempts. Please request a new code.');
  await q(undefined, `UPDATE hookooh_login_otps SET attempts=attempts+1 WHERE id=$1`, [row.id]);
  if (row.code_hash !== hashLoginOtp(phone, code)) throw new Error('Invalid code. Please try again.');
  await q(undefined, `UPDATE hookooh_login_otps SET consumed_at=NOW() WHERE id=$1`, [row.id]);
  const user = await findOrCreatePhoneUser(phone);
  return completeOAuthLogin({ userId: user.userId, email: user.email, name: 'Hookooh user', packageId });
}
