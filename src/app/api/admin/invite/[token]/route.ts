import { NextResponse } from 'next/server';
import { acceptInvitation, classifyAdminInvite, getInvitationByToken, writeAudit } from '@/lib/admin/rbac';
import { validateAdminPassword } from '@/lib/admin/password-policy';
import { query } from '@/lib/db/postgres';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getInvitationByToken(token);
  const status = classifyAdminInvite(invite);
  if (status !== 'valid' || !invite) {
    return NextResponse.json({ error: 'This invitation is not valid.', status }, { status: 400 });
  }
  const { rows } = await query<{ name: string }>(
    `SELECT r.name
       FROM public.admin_user_roles ur
       JOIN public.admin_roles r ON r.id = ur.role_id
      WHERE ur.user_id = $1 AND ur.active`,
    [invite.user_id]
  );
  return NextResponse.json({
    email: invite.email,
    firstName: invite.first_name,
    lastName: invite.last_name,
    roles: rows.map((row) => row.name),
    expiresAt: invite.expires_at,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await request.json().catch(() => ({}));
  const passwordError = validateAdminPassword(String(body.password || ''), body.confirmPassword);
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });
  try {
    const invite = await acceptInvitation(token, String(body.password));
    await writeAudit({
      actorUserId: invite.user_id,
      actorEmail: invite.email,
      action: 'admin.invite_accepted',
      targetUserId: invite.user_id,
      targetEmail: invite.email,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = (error as { status?: number }).status || 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not accept invitation' }, { status });
  }
}
