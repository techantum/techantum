import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getLeadDiscoveryRun } from '@/lib/places/service';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  try {
    const { id } = await context.params;
    const data = await getLeadDiscoveryRun(id);
    if (!data) return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load run' },
      { status: 500 }
    );
  }
}
