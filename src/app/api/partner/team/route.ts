import { NextResponse } from 'next/server';
import { requirePartnerTeamManager } from '@/lib/partner/auth';
import { invitePartnerTeamMember, listPartnerTeamMembers } from '@/lib/partner/team';
import type { PartnerUserRole } from '@/lib/partner/types';

export async function GET() {
  const auth = await requirePartnerTeamManager();
  if ('error' in auth) return auth.error;

  const members = await listPartnerTeamMembers(auth.partner.id);
  return NextResponse.json({
    members,
    leadDiscoveryEnabled: Boolean(auth.partner.lead_discovery_enabled),
    actorRole: auth.partnerUser.role,
  });
}

export async function POST(request: Request) {
  const auth = await requirePartnerTeamManager();
  if ('error' in auth) return auth.error;

  const body = await request.json();
  const requestedRole = (body.role || 'partner_user') as PartnerUserRole;
  const role =
    requestedRole === 'partner_admin' && auth.partnerUser.role === 'partner_admin'
      ? 'partner_admin'
      : 'partner_user';

  const result = await invitePartnerTeamMember({
    partnerId: auth.partner.id,
    invitedByUserId: auth.partnerUser.id,
    email: String(body.email || ''),
    fullName: String(body.fullName || ''),
    role,
    navAccess: body.navAccess,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const members = await listPartnerTeamMembers(auth.partner.id);
  return NextResponse.json({
    members,
    leadDiscoveryEnabled: Boolean(auth.partner.lead_discovery_enabled),
    actorRole: auth.partnerUser.role,
  });
}
