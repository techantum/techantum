import { cache } from 'react';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { canManagePartnerTeam, partnerHasNavAccess, type PartnerNavKey } from './nav';
import type { Partner, PartnerUser } from './types';

export interface PartnerSession {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string; email?: string };
  partnerUser: PartnerUser;
  partner: Partner;
}

const loadPartnerSession = cache(async (): Promise<PartnerSession | { error: NextResponse }> => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const admin = createAdminClient();
  const { data: partnerUser } = await admin
    .from('partner_users')
    .select('*, partners(*)')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!partnerUser || partnerUser.status !== 'active') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  const nested = partnerUser.partners as Partner | Partner[] | null;
  const partner = Array.isArray(nested) ? nested[0] : nested;

  if (!partner || partner.status !== 'active') {
    return { error: NextResponse.json({ error: 'Partner account inactive' }, { status: 403 }) };
  }

  const { partners: _partners, ...userRow } = partnerUser as typeof partnerUser & { partners?: unknown };

  return {
    supabase,
    user,
    partnerUser: userRow as PartnerUser,
    partner,
  };
});

export async function requirePartner(): Promise<PartnerSession | { error: NextResponse }> {
  return loadPartnerSession();
}

export async function getPartnerSession(): Promise<PartnerSession | null> {
  const result = await requirePartner();
  if ('error' in result) return null;
  return result;
}

function forbiddenArea() {
  return NextResponse.json({ error: 'You do not have access to this area.' }, { status: 403 });
}

export async function requirePartnerNav(key: PartnerNavKey): Promise<PartnerSession | { error: NextResponse }> {
  const auth = await requirePartner();
  if ('error' in auth) return auth;
  if (!partnerHasNavAccess(auth.partnerUser, key, auth.partner)) {
    return { error: forbiddenArea() };
  }
  return auth;
}

export async function requirePartnerNavAny(
  keys: PartnerNavKey[]
): Promise<PartnerSession | { error: NextResponse }> {
  const auth = await requirePartner();
  if ('error' in auth) return auth;
  if (!keys.some((key) => partnerHasNavAccess(auth.partnerUser, key, auth.partner))) {
    return { error: forbiddenArea() };
  }
  return auth;
}

export async function requirePartnerTeamManager(): Promise<PartnerSession | { error: NextResponse }> {
  const auth = await requirePartner();
  if ('error' in auth) return auth;
  if (!canManagePartnerTeam(auth.partnerUser)) {
    return { error: NextResponse.json({ error: 'You do not have access to manage team members.' }, { status: 403 }) };
  }
  return auth;
}

export async function requirePartnerAdmin(): Promise<PartnerSession | { error: NextResponse }> {
  const auth = await requirePartner();
  if ('error' in auth) return auth;
  if (auth.partnerUser.role !== 'partner_admin') {
    return { error: NextResponse.json({ error: 'Only partner admins can update this setting.' }, { status: 403 }) };
  }
  return auth;
}

export async function logPartnerActivity(
  partnerId: string,
  action: string,
  options?: {
    partnerUserId?: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
  }
) {
  const supabase = createAdminClient();
  void supabase
    .from('partner_activity_logs')
    .insert({
      partner_id: partnerId,
      partner_user_id: options?.partnerUserId ?? null,
      action,
      entity_type: options?.entityType ?? null,
      entity_id: options?.entityId ?? null,
      metadata: options?.metadata ?? {},
      ip_address: options?.ipAddress ?? null,
    })
    .then(() => undefined, () => undefined);
}
