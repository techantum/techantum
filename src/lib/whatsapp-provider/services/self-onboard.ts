import type { User } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { sanitizeEmail, sanitizePhone, sanitizeString } from '@/lib/security/sanitize';
import { writeAuditLog, notify } from '../audit';
import { startOnboarding } from './onboarding';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSelfOnboardPassword(password: string) {
  if (!password || password.length < 10) return 'Password must be at least 10 characters.';
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return 'Password must include letters and numbers.';
  return '';
}

export async function registerSelfServeClient(input: {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  password: string;
}) {
  const companyName = sanitizeString(input.companyName).slice(0, 120);
  const contactName = sanitizeString(input.contactName).slice(0, 120);
  const email = sanitizeEmail(input.email);
  const phone = sanitizePhone(input.phone);
  const passwordError = validateSelfOnboardPassword(input.password);

  if (!companyName) throw Object.assign(new Error('Company name is required.'), { status: 400 });
  if (!contactName) throw Object.assign(new Error('Contact name is required.'), { status: 400 });
  if (!EMAIL_RE.test(email)) throw Object.assign(new Error('A valid work email is required.'), { status: 400 });
  if (passwordError) throw Object.assign(new Error(passwordError), { status: 400 });

  const supabase = createAdminClient();
  const { data: existingMember } = await supabase.from('wa_client_users').select('id').eq('email', email).maybeSingle();
  if (existingMember) {
    throw Object.assign(new Error('An account with this email already exists. Please sign in.'), { status: 409 });
  }

  const created = await supabase.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { company_name: companyName, contact_name: contactName, source: 'connect-whatsapp' },
  });
  if (created.error || !created.data.user) {
    throw Object.assign(new Error(created.error?.message || 'Could not create your account.'), { status: 400 });
  }

  const { data: client, error: clientError } = await supabase
    .from('wa_clients')
    .insert({
      name: companyName,
      legal_name: companyName,
      contact_name: contactName,
      email,
      phone: phone || null,
      status: 'ONBOARDING',
      onboarding_status: 'CLIENT_CREATED',
      meta_connection_status: 'DISCONNECTED',
    })
    .select('*')
    .single();

  if (clientError || !client) {
    await supabase.auth.admin.deleteUser(created.data.user.id).catch(() => undefined);
    throw new Error(clientError?.message || 'Could not create the WhatsApp workspace.');
  }

  await supabase.from('wa_billing_accounts').insert({ client_id: client.id, plan: 'BASIC' });
  const { error: memberError } = await supabase.from('wa_client_users').insert({
    client_id: client.id,
    user_id: created.data.user.id,
    email,
    name: contactName,
    role: 'CLIENT_ADMIN',
    status: 'ACTIVE',
  });
  if (memberError) {
    throw new Error(memberError.message);
  }

  await startOnboarding(client.id);
  await writeAuditLog({
    clientId: client.id,
    actorUserId: created.data.user.id,
    action: 'client.created',
    resourceType: 'wa_client',
    resourceId: client.id,
    newValues: { source: 'self_serve', name: companyName },
  });
  await notify({ clientId: client.id, type: 'onboarding.started', title: `${companyName} started WhatsApp self-onboarding` });

  return { email, clientId: client.id, companyName };
}

function displayNameFromUser(user: User) {
  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  const name = String(meta.full_name || meta.name || meta.contact_name || '').trim();
  if (name) return name.slice(0, 120);
  const email = (user.email || '').split('@')[0];
  return (email || user.phone || 'Client').slice(0, 120);
}

export async function ensureClientWorkspace(user: User) {
  const supabase = createAdminClient();
  const { data: adminRow } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
  if (adminRow) return { kind: 'admin' as const, clientId: null };
  const { data: partnerRow } = await supabase.from('partner_users').select('user_id').eq('user_id', user.id).maybeSingle();
  if (partnerRow) return { kind: 'partner' as const, clientId: null };

  const existing = await getSelfServeSession(user.id);
  if (existing) return { kind: 'client' as const, clientId: existing.clientId };

  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  const contactName = displayNameFromUser(user);
  const companyName = String(meta.company_name || meta.company || `${contactName}'s workspace`).slice(0, 120);
  const email = sanitizeEmail(user.email || '') || `${user.id}@users.techantum.local`;
  const phone = sanitizePhone(String(meta.phone || user.phone || ''));

  const { data: client, error: clientError } = await supabase
    .from('wa_clients')
    .insert({
      name: companyName,
      legal_name: companyName,
      contact_name: contactName,
      email,
      phone: phone || null,
      status: 'ONBOARDING',
      onboarding_status: 'CLIENT_CREATED',
      meta_connection_status: 'DISCONNECTED',
    })
    .select('*')
    .single();

  if (clientError || !client) {
    throw new Error(clientError?.message || 'Could not create the workspace.');
  }

  await supabase.from('wa_billing_accounts').insert({ client_id: client.id, plan: 'BASIC' });
  const { error: memberError } = await supabase.from('wa_client_users').insert({
    client_id: client.id,
    user_id: user.id,
    email,
    name: contactName,
    role: 'CLIENT_ADMIN',
    status: 'ACTIVE',
  });
  if (memberError) throw new Error(memberError.message);

  await startOnboarding(client.id);
  await writeAuditLog({
    clientId: client.id,
    actorUserId: user.id,
    action: 'client.created',
    resourceType: 'wa_client',
    resourceId: client.id,
    newValues: { source: 'site_login', name: companyName },
  });
  await notify({ clientId: client.id, type: 'onboarding.started', title: `${companyName} signed in on the website` });
  return { kind: 'client' as const, clientId: client.id as string };
}

export async function getSelfServeSession(userId: string) {
  const supabase = createAdminClient();
  const { data: membership } = await supabase
    .from('wa_client_users')
    .select('client_id, role, email, name, status')
    .eq('user_id', userId)
    .eq('status', 'ACTIVE')
    .maybeSingle();
  if (!membership) return null;
  const { data: client } = await supabase
    .from('wa_clients')
    .select('id,name,onboarding_status,meta_connection_status,status,platform_health')
    .eq('id', membership.client_id)
    .maybeSingle();
  return {
    clientId: membership.client_id as string,
    role: membership.role,
    email: membership.email,
    name: membership.name,
    companyName: client?.name || '',
    onboardingStatus: client?.onboarding_status || 'CLIENT_CREATED',
    metaConnectionStatus: client?.meta_connection_status || 'DISCONNECTED',
    clientStatus: client?.status || 'ONBOARDING',
    platformHealth: client?.platform_health || 'UNKNOWN',
    connected: client?.meta_connection_status === 'CONNECTED',
  };
}
