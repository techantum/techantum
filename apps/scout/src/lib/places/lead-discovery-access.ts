import { NextResponse } from 'next/server';
import { isSuperAdmin } from '@/lib/admin/roles';
import { FEATURE_LEADS, resolveAccess } from '@/lib/saas/catalog';
import { getPlatformActor } from '@/lib/saas/session';

export type LeadDiscoveryAccess =
  | {
      actor: 'admin';
      user: { id: string };
      saasAccountId?: string;
    }
  | {
      actor: 'partner';
      user: { id: string };
      partnerId: string;
      saasAccountId?: string;
    }
  | {
      actor: 'saas';
      user: { id: string };
      saasAccountId: string;
    };

export async function requireLeadDiscoveryAccess(): Promise<
  LeadDiscoveryAccess | { error: NextResponse }
> {
  const actor = await getPlatformActor();
  if (!actor) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (isSuperAdmin(actor.role)) {
    return { actor: 'admin', user: { id: actor.userId } };
  }
  if (!actor.account) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const access = await resolveAccess(actor.account, actor.role);
  if (!access.has(FEATURE_LEADS)) {
    return { error: NextResponse.json({ error: 'Lead Discovery is not included in your package.' }, { status: 402 }) };
  }
  return { actor: 'saas', user: { id: actor.userId }, saasAccountId: actor.account.id };
}
