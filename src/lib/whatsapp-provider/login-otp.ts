import { randomInt } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeWhatsAppNumber, whatsappApiTo } from '@/lib/ops/phone';
import { getWhatsAppAiConfig } from '@/lib/whatsapp/config';
import { sendWhatsAppSessionText } from '@/lib/whatsapp/meta';
import { sendWhatsAppText } from '@/lib/ops/whatsapp';
import { ensureClientWorkspace } from './services/self-onboard';
import { hashLoginOtp, phoneLoginEmail } from './login-otp-crypto';

export { hashLoginOtp, phoneLoginEmail } from './login-otp-crypto';

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function pepper() {
  return (
    process.env.LOGIN_OTP_PEPPER?.trim() ||
    process.env.AI_SECRETS_ENCRYPTION_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    'techantum-login-otp'
  );
}

async function sendOtpWhatsApp(phone: string, code: string) {
  const cfg = getWhatsAppAiConfig();
  const templateName = process.env.WHATSAPP_LOGIN_OTP_TEMPLATE?.trim();
  const message = `Your TechAntum login code is ${code}. It expires in 10 minutes. Do not share this code.`;

  if (cfg.configured && templateName) {
    const res = await fetch(`https://graph.facebook.com/${cfg.graphVersion}/${cfg.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: whatsappApiTo(phone),
        type: 'template',
        template: {
          name: templateName,
          language: { code: process.env.WHATSAPP_LOGIN_OTP_TEMPLATE_LANG?.trim() || 'en' },
          components: [
            { type: 'body', parameters: [{ type: 'text', text: code }] },
            {
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [{ type: 'text', text: code }],
            },
          ],
        },
      }),
    });
    if (res.ok) return { ok: true as const };
  }

  const templated = await sendWhatsAppText(phone, message).catch((err) => ({
    ok: false as const,
    error_message: err instanceof Error ? err.message : 'WhatsApp template send failed.',
  }));
  if (templated.ok) return { ok: true as const };

  const sent = await sendWhatsAppSessionText(phone, message);
  if (sent.ok) return { ok: true as const };

  return {
    ok: false as const,
    error:
      templated.error_message ||
      sent.error_message ||
      'Could not send the code on WhatsApp. Please try Google or Facebook, or message TechAntum on WhatsApp first.',
  };
}

export async function sendWhatsAppLoginOtp(rawPhone: string) {
  const phone = normalizeWhatsAppNumber(rawPhone);
  if (!phone) throw Object.assign(new Error('Enter a valid WhatsApp number with country code.'), { status: 400 });

  const supabase = createAdminClient();
  const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('wa_login_otps')
    .select('*', { count: 'exact', head: true })
    .eq('phone', phone)
    .gte('created_at', windowStart);
  if ((count || 0) >= 4) {
    throw Object.assign(new Error('Please wait a few minutes before requesting another code.'), { status: 429 });
  }

  const code = String(randomInt(100000, 999999));
  const { error } = await supabase.from('wa_login_otps').insert({
    phone,
    code_hash: hashLoginOtp(phone, code, pepper()),
    expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
  });
  if (error) throw new Error(error.message);

  const sent = await sendOtpWhatsApp(phone, code);
  if (!sent.ok) throw Object.assign(new Error(sent.error), { status: 400 });
  return { ok: true, phone };
}

async function findOrCreatePhoneUser(phone: string) {
  const supabase = createAdminClient();
  const email = phoneLoginEmail(phone);
  const { data: identity } = await supabase.from('wa_login_identities').select('user_id, email').eq('phone', phone).maybeSingle();
  if (identity?.user_id) {
    return { userId: identity.user_id as string, email: identity.email as string };
  }

  const created = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    phone,
    phone_confirm: true,
    user_metadata: { phone, login_method: 'whatsapp_otp', full_name: phone },
  });

  let userId = created.data.user?.id;
  if (!userId && created.error) {
    const retry = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { phone, login_method: 'whatsapp_otp', full_name: phone },
    });
    userId = retry.data.user?.id;
    if (!userId) {
      const generated = await supabase.auth.admin.generateLink({ type: 'magiclink', email });
      userId = generated.data.user?.id;
      if (!userId) {
        throw new Error(created.error?.message || retry.error?.message || generated.error?.message || 'Could not create your account.');
      }
    }
  } else if (!userId) {
    const generated = await supabase.auth.admin.generateLink({ type: 'magiclink', email });
    userId = generated.data.user?.id;
    if (!userId) {
      throw new Error(generated.error?.message || 'Could not create your account.');
    }
  }

  await supabase.from('wa_login_identities').upsert({ phone, user_id: userId, email });
  return { userId, email };
}

export async function verifyWhatsAppLoginOtp(rawPhone: string, rawCode: string) {
  const phone = normalizeWhatsAppNumber(rawPhone);
  const code = String(rawCode || '').replace(/\D/g, '');
  if (!phone || code.length !== 6) {
    throw Object.assign(new Error('Enter the 6-digit code sent on WhatsApp.'), { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from('wa_login_otps')
    .select('*')
    .eq('phone', phone)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) throw Object.assign(new Error('No active code found. Please request a new one.'), { status: 400 });
  if (new Date(row.expires_at).getTime() < Date.now()) {
    throw Object.assign(new Error('That code has expired. Please request a new one.'), { status: 400 });
  }
  if ((row.attempts || 0) >= MAX_ATTEMPTS) {
    throw Object.assign(new Error('Too many attempts. Please request a new code.'), { status: 400 });
  }

  const ok = row.code_hash === hashLoginOtp(phone, code, pepper());
  await supabase.from('wa_login_otps').update({ attempts: (row.attempts || 0) + 1 }).eq('id', row.id);
  if (!ok) throw Object.assign(new Error('Invalid code. Please try again.'), { status: 400 });
  await supabase.from('wa_login_otps').update({ consumed_at: new Date().toISOString() }).eq('id', row.id);

  const account = await findOrCreatePhoneUser(phone);
  const { data: userData } = await supabase.auth.admin.getUserById(account.userId);
  if (userData.user) {
    await ensureClientWorkspace(userData.user);
  }

  const link = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: account.email,
  });
  const tokenHash = link.data.properties?.hashed_token;
  if (link.error || !tokenHash) {
    throw new Error(link.error?.message || 'Could not start your session.');
  }
  return { tokenHash, email: account.email };
}
