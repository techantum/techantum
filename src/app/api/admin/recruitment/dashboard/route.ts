import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getRoleDashboard } from '@/lib/recruitment/service';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const rows = await getRoleDashboard();
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
