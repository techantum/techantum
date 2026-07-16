import { createAdminClient } from '@/lib/supabase/admin';
import { sendPartnerOtpEmail } from '@/lib/email/partner-emails';

const OTP_EXPIRY_MINUTES = 10;

function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function isPartnerOtpEnabled(): boolean {
  return process.env.PARTNER_LOGIN_OTP_ENABLED === 'true';
}

export async function createAndSendLoginOtp(partnerUserId: string, email: string, contactName: string) {
  const supabase = createAdminClient();
  const otpCode = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await supabase.from('partner_login_otps').insert({
    partner_user_id: partnerUserId,
    otp_code: otpCode,
    expires_at: expiresAt.toISOString(),
  });

  await supabase
    .from('partner_users')
    .update({ last_otp_verified_at: null })
    .eq('id', partnerUserId);

  const result = await sendPartnerOtpEmail(email, contactName, otpCode, OTP_EXPIRY_MINUTES);
  return result;
}

export async function verifyLoginOtp(partnerUserId: string, code: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data: otp } = await supabase
    .from('partner_login_otps')
    .select('*')
    .eq('partner_user_id', partnerUserId)
    .is('used_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp) return false;
  if (new Date(otp.expires_at) < new Date()) return false;
  if (otp.otp_code !== code.trim()) return false;

  const now = new Date().toISOString();
  await supabase.from('partner_login_otps').update({ used_at: now }).eq('id', otp.id);
  await supabase
    .from('partner_users')
    .update({ last_otp_verified_at: now })
    .eq('id', partnerUserId);

  return true;
}

export async function isOtpVerificationRequired(partnerUserId: string): Promise<boolean> {
  if (!isPartnerOtpEnabled()) return false;

  const supabase = createAdminClient();
  const { data: user } = await supabase
    .from('partner_users')
    .select('last_otp_verified_at')
    .eq('id', partnerUserId)
    .maybeSingle();

  if (!user?.last_otp_verified_at) return true;

  const verifiedAt = new Date(user.last_otp_verified_at).getTime();
  const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
  return verifiedAt < twelveHoursAgo;
}
