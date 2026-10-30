import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  return NextResponse.json({
    email: auth.email,
    role: auth.role,
    userId: auth.user.id,
    isSuperAdmin: auth.isSuperAdmin,
    rbacManaged: auth.rbacManaged,
    access: auth.access,
    roleNames: auth.roleNames,
  });
}
