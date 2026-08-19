import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { previewTicketUpdate } from '@/lib/ops/service';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const { id } = await params;
    return NextResponse.json(await previewTicketUpdate(id));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to preview message' }, { status: 400 });
  }
}
