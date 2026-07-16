import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { resendPartnerInvite } from '@/lib/partner/service';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const { id } = await params;
  const result = await resendPartnerInvite(id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: 'Invite email resent successfully.' });
}
