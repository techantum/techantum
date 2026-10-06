import { NextResponse } from 'next/server';
import { requirePartnerTeamManager } from '@/lib/partner/auth';
import { deletePartnerTeamMember, listPartnerTeamMembers, updatePartnerTeamMember } from '@/lib/partner/team';
import type { PartnerUserRole } from '@/lib/partner/types';

async function teamResponse(partnerId: string, actorRole: PartnerUserRole, leadDiscoveryEnabled: boolean) {
  const members = await listPartnerTeamMembers(partnerId);
  return NextResponse.json({ members, leadDiscoveryEnabled, actorRole });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePartnerTeamManager();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const result = await updatePartnerTeamMember({
    partnerId: auth.partner.id,
    memberId: id,
    actorUserId: auth.partnerUser.id,
    actorRole: auth.partnerUser.role,
    fullName: typeof body.fullName === 'string' ? body.fullName : undefined,
    role: body.role as PartnerUserRole | undefined,
    navAccess: body.navAccess,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return teamResponse(auth.partner.id, auth.partnerUser.role, Boolean(auth.partner.lead_discovery_enabled));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePartnerTeamManager();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const result = await deletePartnerTeamMember({
    partnerId: auth.partner.id,
    memberId: id,
    actorUserId: auth.partnerUser.id,
    actorPartnerUserId: auth.partnerUser.id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return teamResponse(auth.partner.id, auth.partnerUser.role, Boolean(auth.partner.lead_discovery_enabled));
}
