import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { requirePartner } from '@/lib/partner/auth';

export type LeadDiscoveryAccess =
  | {
      actor: 'admin';
      user: { id: string };
    }
  | {
      actor: 'partner';
      user: { id: string };
      partnerId: string;
    };

export async function requireLeadDiscoveryAccess(): Promise<
  LeadDiscoveryAccess | { error: NextResponse }
> {
  const admin = await requireAdmin();
  if (!('error' in admin)) {
    return { actor: 'admin', user: admin.user };
  }

  const partner = await requirePartner();
  if ('error' in partner) {
    return admin.error.status === 401 ? admin : partner;
  }

  if (!partner.partner.lead_discovery_enabled) {
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
