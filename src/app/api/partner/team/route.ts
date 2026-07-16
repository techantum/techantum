import { NextResponse } from 'next/server';
import { requirePartner } from '@/lib/partner/auth';
import { invitePartnerTeamMember, listPartnerTeamMembers } from '@/lib/partner/team';
import type { PartnerUserRole } from '@/lib/partner/types';

export async function GET() {
  const auth = await requirePartner();
  if ('error' in auth) return auth.error;

  const members = await listPartnerTeamMembers(auth.partner.id);
  return NextResponse.json(members);
}

export async function POST(request: Request) {
  const auth = await requirePartner();
  if ('error' in auth) return auth.error;

  if (auth.partnerUser.role !== 'partner_admin') {
    return NextResponse.json({ error: 'Only partner admins can invite team members' }, { status: 403 });
  }

  const body = await request.json();
  const result = await invitePartnerTeamMember({
    partnerId: auth.partner.id,
    invitedByUserId: auth.partnerUser.id,
    email: String(body.email || ''),
    fullName: String(body.fullName || ''),
    role: (body.role || 'partner_user') as PartnerUserRole,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const members = await listPartnerTeamMembers(auth.partner.id);
  return NextResponse.json(members);
}
