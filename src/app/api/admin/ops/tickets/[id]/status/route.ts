import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { updateTicketStatus } from '@/lib/ops/service';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const { id } = await params;
    const body = await request.json();
    return NextResponse.json(await updateTicketStatus(id, String(body.status || ''), auth.user.id, body.note));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to update status' }, { status: 400 });
  }
}
