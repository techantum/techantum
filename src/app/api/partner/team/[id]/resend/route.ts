import { NextResponse } from 'next/server';
import { requirePartnerTeamManager } from '@/lib/partner/auth';
import { resendPartnerTeamInvite } from '@/lib/partner/team';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePartnerTeamManager();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const result = await resendPartnerTeamInvite({
    partnerId: auth.partner.id,
    memberId: id,
    invitedByUserId: auth.partnerUser.id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    inviteSent: result.inviteSent !== false,
    inviteError: result.inviteError || null,
    message: result.inviteSent === false
      ? `Invitation could not be sent${result.inviteError ? `: ${result.inviteError}` : ''}.`
      : 'A new invitation has been sent.',
  });
}
