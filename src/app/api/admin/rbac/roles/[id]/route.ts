import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { duplicateRole, getRole, updateRole, writeAudit } from '@/lib/admin/rbac';
import { requestMeta } from '@/lib/finance/access';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin({ feature: 'roles', level: 'READ' });
  if ('error' in auth && auth.error) return auth.error;
  const { id } = await params;
  const role = await getRole(id);
  if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 });
  return NextResponse.json({ role });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin({ feature: 'roles', level: 'FULL' });
  if ('error' in auth && auth.error) return auth.error;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    if (body.duplicate) {
      const role = await duplicateRole(id, String(body.name || ''), auth.user.id);
      await writeAudit({
        actorUserId: auth.user.id,
        actorEmail: auth.email,
        action: 'role.duplicated',
        targetRoleId: role?.id,
        newValue: { from: id, name: body.name },
        ...requestMeta(request),
      });
      return NextResponse.json({ role });
    }
    const previous = await getRole(id);
    const role = await updateRole(id, {
      name: body.name,
      description: body.description,
      status: body.status,
      permissions: body.permissions,
      updatedBy: auth.user.id,
    });
    await writeAudit({
      actorUserId: auth.user.id,
      actorEmail: auth.email,
      action: body.permissions ? 'role.permissions_changed' : 'role.updated',
      targetRoleId: id,
      previousValue: previous,
      newValue: role,
      ...requestMeta(request),
    });
    return NextResponse.json({ role, affectedUsers: previous?.users?.length || 0 });
  } catch (error) {
    const status = (error as { status?: number }).status || 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update role' }, { status });
  }
}
