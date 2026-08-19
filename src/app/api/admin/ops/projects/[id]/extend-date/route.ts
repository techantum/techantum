import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { extendProjectDate } from '@/lib/ops/service';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const { id } = await params;
    const body = await request.json();
    return NextResponse.json(await extendProjectDate(id, String(body.new_end_date || ''), String(body.reason || ''), auth.user.id));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to extend date' }, { status: 400 });
  }
}
