import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import {
  ADMIN_INVITE_HOURS,
  assignRoles,
  createInvitation,
  listAdminUsers,
  searchEmployees,
  upsertAdminIdentity,
  writeAudit,
} from '@/lib/admin/rbac';
import { sendAdminInviteEmail } from '@/lib/email/admin-emails';
import { requestMeta } from '@/lib/finance/access';
import { query } from '@/lib/db/postgres';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireAdmin({ feature: 'users', level: 'READ' });
  if ('error' in auth && auth.error) return auth.error;
  const url = new URL(request.url);
  const employees = url.searchParams.get('employees');
  if (employees !== null) {
    return NextResponse.json({ employees: await searchEmployees(employees) });
  }
  return NextResponse.json({ users: await listAdminUsers() });
}

export async function POST(request: Request) {
  const auth = await requireAdmin({ feature: 'users', level: 'FULL' });
  if ('error' in auth && auth.error) return auth.error;
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const firstName = String(body.firstName || '').trim();
  const lastName = String(body.lastName || '').trim();
  const roleIds: string[] = Array.isArray(body.roleIds) ? body.roleIds : body.roleId ? [body.roleId] : [];
  if (!email || !firstName) {
    return NextResponse.json({ error: 'First name and email are required.' }, { status: 400 });
  }
  try {
    const identity = await upsertAdminIdentity({
      email,
      firstName,
      lastName,
      phone: body.phone,
      notes: body.notes,
      status: 'invited',
      createdBy: auth.user.id,
      existingUserId: body.existingUserId,
    });
    if (roleIds.length) await assignRoles(identity.userId, roleIds, auth.user.id);
    const sendInvite = body.draft !== true && body.sendInvite !== false;
    let inviteExpiresAt: Date | null = null;
    let mailed = { ok: false as boolean, error: undefined as string | undefined };
    if (sendInvite) {
      const invite = await createInvitation(identity.userId, email, auth.user.id);
      inviteExpiresAt = invite.expiresAt;
      const { rows } = await query<{ name: string }>(
        `SELECT name FROM public.admin_roles WHERE id = ANY($1::uuid[])`,
        [roleIds]
      );
      const roleName = rows.map((row) => row.name).join(', ') || 'Admin';
      mailed = await sendAdminInviteEmail({
        to: email,
        name: `${firstName} ${lastName}`.trim(),
        roleName,
        inviteUrl: invite.url,
        hours: ADMIN_INVITE_HOURS,
      });
    }
    await writeAudit({
      actorUserId: auth.user.id,
      actorEmail: auth.email,
      action: sendInvite ? 'admin.invited' : 'admin.drafted',
      targetUserId: identity.userId,
      targetEmail: email,
      newValue: { roles: roleIds, emailSent: mailed.ok, draft: !sendInvite },
      ...requestMeta(request),
    });
    return NextResponse.json({
      userId: identity.userId,
      inviteExpiresAt,
      emailSent: mailed.ok,
      emailError: mailed.error,
    });
  } catch (error) {
    const status = (error as { status?: number }).status || 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not invite admin' }, { status });
  }
}
