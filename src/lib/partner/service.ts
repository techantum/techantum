import { createAdminClient, createAuthAdminClient, setAuthUserPassword } from '@/lib/supabase/admin';
import { sendPartnerInviteEmail } from '@/lib/email/partner-emails';
import { classifyInvite, generateInviteToken, hashInviteToken, inviteExpiryDate, inviteStatusMessage } from './invite-token';
import type { CreatePartnerInput, Partner } from './types';

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

  const auth = createAuthAdminClient();
  const createdAuth = await auth.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: {
      full_name: input.contact_name,
      role: 'partner',
    },
  });
  const authUser = createdAuth.data.user
    ? { user: createdAuth.data.user, created: true, error: undefined as string | undefined }
    : await auth.auth.admin.generateLink({ type: 'magiclink', email }).then((existing) => ({
      user: existing.data.user,
      created: false,
      error: createdAuth.error?.message || existing.error?.message,
    }));

  if (!authUser.user) {
    throw new Error(authUser.error || createdAuth.error?.message || 'Failed to create auth user');
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
    if (authUser.created) await auth.auth.admin.deleteUser(authUser.user.id).catch(() => undefined);
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
    if (authUser.created) await auth.auth.admin.deleteUser(authUser.user.id).catch(() => undefined);
    throw new Error(userError?.message || 'Failed to create partner user');
  }

  const rawToken = generateInviteToken();
  const tokenHash = hashInviteToken(rawToken);
  const expiresAt = inviteExpiryDate();

  const { error: inviteError } = await supabase.from('partner_invites').insert({
    partner_id: partner.id,
    partner_user_id: partnerUser.id,
    token: tokenHash,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  });

  if (inviteError) {
    throw new Error(inviteError.message);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3005';
  const onboardUrl = `${siteUrl.replace(/\/$/, '')}/partner/onboard?token=${rawToken}`;

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

  const rawToken = generateInviteToken();
  const tokenHash = hashInviteToken(rawToken);
  const expiresAt = inviteExpiryDate();

  await supabase.from('partner_invites').insert({
    partner_id: partner.id,
    partner_user_id: partnerUser.id,
    token: tokenHash,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3005';
  const onboardUrl = `${siteUrl.replace(/\/$/, '')}/partner/onboard?token=${rawToken}`;

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

const INVITE_COLUMNS = '*, partners(*), partner_users(*)';

async function findInviteByToken(token: string) {
  const supabase = createAdminClient();
  const hash = hashInviteToken(token);
  const hashed = await supabase
    .from('partner_invites')
    .select(INVITE_COLUMNS)
    .eq('token_hash', hash)
    .maybeSingle();
  if (hashed.data) return hashed.data;

  const legacy = await supabase
    .from('partner_invites')
    .select(INVITE_COLUMNS)
    .eq('token', token)
    .is('token_hash', null)
    .maybeSingle();
  return legacy.data;
}

function presentInvite<T extends { partners: unknown; partner_users: unknown }>(invite: T) {
  return {
    ...invite,
    partners: firstRelated(invite.partners),
    partner_users: firstRelated(invite.partner_users),
  };
}

export async function inspectInviteToken(token: string) {
  const invite = await findInviteByToken(token);
  if (!invite) return { status: 'invalid' as const, invite: null };
  const presented = presentInvite(invite);
  const status = classifyInvite(presented);
  return { status, invite: presented };
}

export async function validateInviteToken(token: string) {
  const result = await inspectInviteToken(token);
  return result.status === 'valid' ? result.invite : null;
}

export { inviteStatusMessage };

function firstRelated<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function completePartnerOnboarding(
  token: string,
  password: string
): Promise<{ ok: boolean; email?: string; error?: string }> {
  const supabase = createAdminClient();
  const inspected = await inspectInviteToken(token);

  if (inspected.status !== 'valid' || !inspected.invite) {
    return { ok: false, error: inviteStatusMessage(inspected.status === 'valid' ? 'invalid' : inspected.status) };
  }
  const invite = inspected.invite;

  const partnerUser = invite.partner_users as { user_id: string; id: string; email: string; partner_id?: string } | null;
  const partner = invite.partners as { id: string } | null;

  if (!partnerUser?.email || !partner?.id) {
    return { ok: false, error: 'Invalid or expired invite link. Please contact your team admin for a new invite.' };
  }
  if (partnerUser.partner_id && partnerUser.partner_id !== partner.id) {
    return { ok: false, error: 'This invitation does not belong to this organization.' };
  }

  let authUserId: string;
  try {
    authUserId = await setAuthUserPassword(partnerUser.email, password, partnerUser.user_id);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not set the password.' };
  }

  if (authUserId !== partnerUser.user_id) {
    await supabase.from('partner_users').update({ user_id: authUserId }).eq('id', partnerUser.id);
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

  return { ok: true, email: partnerUser.email };
}
