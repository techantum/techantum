import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/admin/auth';
import { createDeveloperAdmin, listDeveloperAdmins, removeDeveloperAdmin } from '@/lib/admin/accounts';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireSuperAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const rows = await listDeveloperAdmins();
  return NextResponse.json({ rows });
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin();
  if ('error' in auth && auth.error) return auth.error;

  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  try {
    const created = await createDeveloperAdmin(body.email || '', body.password || '');
    return NextResponse.json({ ok: true, ...created });
  } catch (error) {
    const status = error instanceof Error && 'status' in error ? Number(error.status) || 400 : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not create developer admin' }, { status });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireSuperAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const userId = new URL(request.url).searchParams.get('userId') || '';
  if (!userId) return NextResponse.json({ error: 'Developer admin is required' }, { status: 400 });

  try {
    await removeDeveloperAdmin(userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof Error && 'status' in error ? Number(error.status) || 400 : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not remove developer admin' }, { status });
  }
}
