import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createRole, listRoles, registryPayload, writeAudit } from '@/lib/admin/rbac';
import { requestMeta } from '@/lib/finance/access';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin({ feature: 'roles', level: 'READ' });
  if ('error' in auth && auth.error) return auth.error;
  try {
    const [roles, registry] = await Promise.all([listRoles(), Promise.resolve(registryPayload())]);
    return NextResponse.json({ roles, registry });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load roles' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin({ feature: 'roles', level: 'FULL' });
  if ('error' in auth && auth.error) return auth.error;
  const body = await request.json().catch(() => ({}));
  try {
    const role = await createRole({
      name: String(body.name || ''),
      description: body.description,
      status: body.status,
      permissions: body.permissions || {},
      createdBy: auth.user.id,
    });
    await writeAudit({
      actorUserId: auth.user.id,
      actorEmail: auth.email,
      action: 'role.created',
      targetRoleId: role?.id,
      newValue: { name: body.name, permissions: body.permissions },
      ...requestMeta(request),
    });
    return NextResponse.json({ role });
  } catch (error) {
    const status = (error as { status?: number }).status || 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not create role' }, { status });
  }
}
