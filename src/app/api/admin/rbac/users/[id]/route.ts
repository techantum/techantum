import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import {
  ADMIN_INVITE_HOURS,
  assignRoles,
  createInvitation,
  getAdminUser,
  setAdminStatus,
  writeAudit,
  type AdminUserStatus,
} from '@/lib/admin/rbac';
import { sendAdminInviteEmail } from '@/lib/email/admin-emails';
import { requestMeta } from '@/lib/finance/access';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin({ feature: 'users', level: 'READ' });
  if ('error' in auth && auth.error) return auth.error;
  const { id } = await params;
  const user = await getAdminUser(id);
  if (!user) return NextResponse.json({ error: 'Admin user not found' }, { status: 404 });
  return NextResponse.json({ user });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin({ feature: 'users', level: 'FULL' });
  if ('error' in auth && auth.error) return auth.error;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    if (body.resend) {
      const user = await getAdminUser(id);
      if (!user) return NextResponse.json({ error: 'Admin user not found' }, { status: 404 });
      const invite = await createInvitation(id, user.email, auth.user.id);
      const mailed = await sendAdminInviteEmail({
        to: user.email,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
        roleName: (user.roles || []).map((row: { name: string }) => row.name).join(', ') || 'Admin',
        inviteUrl: invite.url,
        hours: ADMIN_INVITE_HOURS,
      });
      await writeAudit({
        actorUserId: auth.user.id,
        actorEmail: auth.email,
        action: 'admin.invite_resent',
        targetUserId: id,
        targetEmail: user.email,
        ...requestMeta(request),
      });
      return NextResponse.json({ ok: true, emailSent: mailed.ok, emailError: mailed.error });
    }
    if (body.status) {
      const previous = await setAdminStatus(id, body.status as AdminUserStatus, auth.user.id);
      await writeAudit({
        actorUserId: auth.user.id,
        actorEmail: auth.email,
        action: `admin.${body.status}`,
        targetUserId: id,
        previousValue: previous,
        newValue: { status: body.status },
        ...requestMeta(request),
      });
      return NextResponse.json({ ok: true });
    }
    if (body.roleIds) {
      const changed = await assignRoles(id, body.roleIds, auth.user.id);
      await writeAudit({
        actorUserId: auth.user.id,
        actorEmail: auth.email,
        action: 'admin.roles_assigned',
        targetUserId: id,
        previousValue: changed.previous,
        newValue: changed.next,
        ...requestMeta(request),
      });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'No changes provided' }, { status: 400 });
  } catch (error) {
    const status = (error as { status?: number }).status || 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update admin user' }, { status });
  }
}
