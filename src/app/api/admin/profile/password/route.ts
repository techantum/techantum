import { NextResponse } from 'next/server';
import { changeSuperAdminPassword } from '@/lib/admin/accounts';
import { requireSuperAdmin } from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireSuperAdmin();
  if ('error' in auth && auth.error) return auth.error;

  let body: { currentPassword?: string; nextPassword?: string };
  try {
    body = (await request.json()) as { currentPassword?: string; nextPassword?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  try {
    await changeSuperAdminPassword(auth.user.id, body.currentPassword || '', body.nextPassword || '');
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof Error && 'status' in error ? Number(error.status) || 400 : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not change password' }, { status });
  }
}
