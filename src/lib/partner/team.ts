import { randomBytes } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPartnerTeamInviteEmail } from '@/lib/email/partner-emails';
import type { PartnerUserRole } from './types';

const INVITE_EXPIRY_DAYS = 7;

function generateInviteToken(): string {
  return randomBytes(32).toString('hex');
}

export async function invitePartnerTeamMember(input: {
  partnerId: string;
  invitedByUserId: string;
  email: string;
  fullName: string;
  role?: PartnerUserRole;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  const email = input.email.trim().toLowerCase();

  const { data: existingUser } = await supabase
    .from('partner_users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingUser) {
    return { ok: false, error: 'This email is already registered in the Partner Portal.' };
  }

  const { data: partner } = await supabase
    .from('partners')
    .select('company_name, partner_code')
    .eq('id', input.partnerId)
    .single();

  if (!partner) return { ok: false, error: 'Partner not found' };

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: { full_name: input.fullName, role: 'partner' },
  });

  if (authError || !authUser.user) {
    return { ok: false, error: authError?.message || 'Failed to create user' };
  }

  const { data: partnerUser, error: userError } = await supabase
    .from('partner_users')
    .insert({
      partner_id: input.partnerId,
      user_id: authUser.user.id,
      email,
      full_name: input.fullName.trim(),
      role: input.role || 'partner_user',
      status: 'pending',
    })
    .select('*')
    .single();

  if (userError || !partnerUser) {
    await supabase.auth.admin.deleteUser(authUser.user.id);
    return { ok: false, error: userError?.message || 'Failed to create team member' };
  }

  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await supabase.from('partner_invites').insert({
    partner_id: input.partnerId,
    partner_user_id: partnerUser.id,
    token,
    expires_at: expiresAt.toISOString(),
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3005';
  const onboardUrl = `${siteUrl.replace(/\/$/, '')}/partner/onboard?token=${token}`;

  const emailResult = await sendPartnerTeamInviteEmail({
    to: email,
    contactName: input.fullName,
    companyName: partner.company_name,
    partnerCode: partner.partner_code,
    onboardUrl,
  });

  await supabase.from('partner_activity_logs').insert({
    partner_id: input.partnerId,
    partner_user_id: input.invitedByUserId,
    action: 'team_member_invited',
    metadata: { invited_email: email, email_sent: emailResult.ok },
  });

  if (!emailResult.ok) {
    return { ok: false, error: emailResult.error || 'Invite created but email failed' };
  }

  return { ok: true };
}

export async function listPartnerTeamMembers(partnerId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('partner_users')
    .select('id, email, full_name, role, status, last_login_at, created_at')
    .eq('partner_id', partnerId)
    .order('created_at');
  return data ?? [];
}
