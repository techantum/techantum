import { randomBytes } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPartnerInviteEmail } from '@/lib/email/partner-emails';
import type { CreatePartnerInput, Partner } from './types';

const INVITE_EXPIRY_DAYS = 7;

function generateInviteToken(): string {
  return randomBytes(32).toString('hex');
}

export async function createPartnerWithInvite(
  input: CreatePartnerInput
): Promise<{ partner: Partner; inviteSent: boolean; inviteError?: string }> {
  const supabase = createAdminClient();
  const email = input.email.trim().toLowerCase();

  const { data: existingPartner } = await supabase
    .from('partners')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingPartner) {
    throw new Error('A partner with this email already exists');
  }

  const { data: partnerCodeRow } = await supabase.rpc('generate_partner_code');
  const partnerCode =
    typeof partnerCodeRow === 'string'
      ? partnerCodeRow
      : `PART-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: {
      full_name: input.contact_name,
      role: 'partner',
    },
  });

  if (authError || !authUser.user) {
    throw new Error(authError?.message || 'Failed to create auth user');
  }

  const { data: partner, error: partnerError } = await supabase
    .from('partners')
    .insert({
      partner_code: partnerCode,
      company_name: input.company_name.trim(),
      contact_name: input.contact_name.trim(),
      email,
      phone: input.phone?.trim() || null,
      partner_type: input.partner_type,
      tier: input.tier || 'silver',
      status: 'pending',
      country: input.country?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select('*')
    .single();

  if (partnerError || !partner) {
    await supabase.auth.admin.deleteUser(authUser.user.id);
    throw new Error(partnerError?.message || 'Failed to create partner');
  }

  const { data: partnerUser, error: userError } = await supabase
    .from('partner_users')
    .insert({
      partner_id: partner.id,
      user_id: authUser.user.id,
      email,
      full_name: input.contact_name.trim(),
      role: 'partner_admin',
      status: 'pending',
    })
    .select('*')
    .single();

  if (userError || !partnerUser) {
    await supabase.from('partners').delete().eq('id', partner.id);
    await supabase.auth.admin.deleteUser(authUser.user.id);
    throw new Error(userError?.message || 'Failed to create partner user');
  }

  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const { error: inviteError } = await supabase.from('partner_invites').insert({
    partner_id: partner.id,
    partner_user_id: partnerUser.id,
    token,
    expires_at: expiresAt.toISOString(),
  });

  if (inviteError) {
    throw new Error(inviteError.message);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3005';
  const onboardUrl = `${siteUrl.replace(/\/$/, '')}/partner/onboard?token=${token}`;

  const emailResult = await sendPartnerInviteEmail({
    to: email,
    contactName: input.contact_name,
    companyName: input.company_name,
    partnerCode: partner.partner_code,
    partnerType: input.partner_type,
    onboardUrl,
  });

  await supabase.from('partner_email_logs').insert({
    partner_id: partner.id,
    email_type: 'partner_invite',
    recipient: email,
    subject: 'Welcome to TechAntum Partner Portal — Set Your Password',
    status: emailResult.ok ? 'sent' : 'failed',
    error_message: emailResult.error ?? null,
  });

  await supabase.from('partner_activity_logs').insert({
    partner_id: partner.id,
    partner_user_id: partnerUser.id,
    action: 'partner_created',
    metadata: { invited_by: 'admin', email_sent: emailResult.ok },
  });

  return {
    partner: partner as Partner,
    inviteSent: emailResult.ok,
    inviteError: emailResult.error,
  };
}

export async function resendPartnerInvite(partnerId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { data: partner } = await supabase
    .from('partners')
    .select('*')
    .eq('id', partnerId)
    .maybeSingle();

  if (!partner) return { ok: false, error: 'Partner not found' };
  if (partner.status === 'active') return { ok: false, error: 'Partner is already active' };
  if (partner.status === 'suspended') return { ok: false, error: 'Partner is suspended' };

  const { data: partnerUser } = await supabase
    .from('partner_users')
    .select('*')
    .eq('partner_id', partnerId)
    .maybeSingle();

  if (!partnerUser) return { ok: false, error: 'Partner user not found' };

  await supabase
    .from('partner_invites')
    .update({ used_at: new Date().toISOString() })
    .eq('partner_id', partnerId)
    .is('used_at', null);

  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await supabase.from('partner_invites').insert({
    partner_id: partner.id,
    partner_user_id: partnerUser.id,
    token,
    expires_at: expiresAt.toISOString(),
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3005';
  const onboardUrl = `${siteUrl.replace(/\/$/, '')}/partner/onboard?token=${token}`;

  const emailResult = await sendPartnerInviteEmail({
    to: partner.email,
    contactName: partner.contact_name,
    companyName: partner.company_name,
    partnerCode: partner.partner_code,
    partnerType: partner.partner_type,
    onboardUrl,
  });

  await supabase.from('partner_email_logs').insert({
    partner_id: partner.id,
    email_type: 'partner_invite_resend',
    recipient: partner.email,
    subject: 'TechAntum Partner Portal — Set Your Password',
    status: emailResult.ok ? 'sent' : 'failed',
    error_message: emailResult.error ?? null,
  });

  return emailResult;
}

export async function validateInviteToken(token: string) {
  const supabase = createAdminClient();

  const { data: invite } = await supabase
    .from('partner_invites')
    .select('*, partners(*), partner_users(*)')
    .eq('token', token)
    .is('used_at', null)
    .maybeSingle();

  if (!invite) return null;
  if (new Date(invite.expires_at) < new Date()) return null;

  return invite;
}

export async function completePartnerOnboarding(
  token: string,
  password: string
): Promise<{ ok: boolean; email?: string; error?: string }> {
  const supabase = createAdminClient();
  const invite = await validateInviteToken(token);

  if (!invite) {
    return { ok: false, error: 'Invalid or expired invite link. Please contact TechAntum for a new invite.' };
  }

  const partnerUser = invite.partner_users as { user_id: string; id: string };
  const partner = invite.partners as { id: string; email: string };

  const { error: updateError } = await supabase.auth.admin.updateUserById(partnerUser.user_id, {
    password,
    email_confirm: true,
  });

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  const now = new Date().toISOString();

  await Promise.all([
    supabase.from('partner_invites').update({ used_at: now }).eq('id', invite.id),
    supabase
      .from('partners')
      .update({
        status: 'active',
        joined_at: (invite.partners as { joined_at?: string | null }).joined_at ?? now,
      })
      .eq('id', partner.id),
    supabase.from('partner_users').update({ status: 'active' }).eq('id', partnerUser.id),
    supabase.from('partner_activity_logs').insert({
      partner_id: partner.id,
      partner_user_id: partnerUser.id,
      action: 'partner_onboarded',
      metadata: { method: 'invite_link' },
    }),
  ]);

  return { ok: true, email: partner.email };
}
