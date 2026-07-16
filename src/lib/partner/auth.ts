import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Partner, PartnerUser } from './types';

export interface PartnerSession {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string; email?: string };
  partnerUser: PartnerUser;
  partner: Partner;
}

export async function requirePartner(): Promise<
  PartnerSession | { error: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: partnerUser } = await supabase
    .from('partner_users')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!partnerUser || partnerUser.status !== 'active') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  const { data: partner } = await supabase
    .from('partners')
    .select('*')
    .eq('id', partnerUser.partner_id)
    .maybeSingle();

  if (!partner || partner.status !== 'active') {
    return { error: NextResponse.json({ error: 'Partner account inactive' }, { status: 403 }) };
  }

  return {
    supabase,
    user,
    partnerUser: partnerUser as PartnerUser,
    partner: partner as Partner,
  };
}

export async function getPartnerSession(): Promise<PartnerSession | null> {
  const result = await requirePartner();
  if ('error' in result) return null;
  return result;
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
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const supabase = createAdminClient();
  await supabase.from('partner_activity_logs').insert({
    partner_id: partnerId,
    partner_user_id: options?.partnerUserId ?? null,
    action,
    entity_type: options?.entityType ?? null,
    entity_id: options?.entityId ?? null,
    metadata: options?.metadata ?? {},
    ip_address: options?.ipAddress ?? null,
  });
}
