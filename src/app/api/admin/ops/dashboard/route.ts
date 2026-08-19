import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { dashboardSummary } from '@/lib/ops/service';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    return NextResponse.json(await dashboardSummary());
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to load dashboard' }, { status: 500 });
  }
}
