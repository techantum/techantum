import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { isSuperAdmin } from '@/lib/admin/roles';
import { requirePartner } from '@/lib/partner/auth';
import { partnerHasNavAccess } from '@/lib/partner/nav';
import { entitlementsFor, getSaasActor } from '@/lib/saas/session';

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
  const admin = await requireAdmin();
  if (!('error' in admin)) {
    if (!isSuperAdmin(admin.role)) {
      return { error: NextResponse.json({ error: 'Super admin access required' }, { status: 403 }) };
    }
    return { actor: 'admin', user: admin.user };
  }

  const partner = await requirePartner();
  if ('partner' in partner && partner.partner) {
    if (!partner.partner.lead_discovery_enabled || !partnerHasNavAccess(partner.partnerUser, 'lead-discovery', partner.partner)) {
      return {
        error: NextResponse.json(
          { error: 'Lead Discovery is not enabled for this partner account.' },
          { status: 403 }
        ),
      };
    }
    return {
      actor: 'partner',
      user: partner.user,
      partnerId: partner.partner.id,
    };
  }

  const saas = await getSaasActor();
  if (saas) {
    const access = entitlementsFor(saas.account);
    if (!access.leads) {
      return { error: NextResponse.json({ error: 'Lead Discovery is not on your current plan.' }, { status: 402 }) };
    }
    return { actor: 'saas', user: { id: saas.userId }, saasAccountId: saas.account.id };
  }

  const partnerError = 'error' in partner && partner.error
    ? partner.error
    : NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ('error' in admin && admin.error && admin.error.status === 401) {
    return { error: admin.error };
  }
  return { error: partnerError };
}
