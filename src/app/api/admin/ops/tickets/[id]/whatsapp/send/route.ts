import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getTicket, sendClientMessage } from '@/lib/ops/service';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const { id } = await params;
    const body = await request.json();
    const detail = await getTicket(id);
    if (!detail) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    const communication = await sendClientMessage({
      clientId: detail.ticket.client_id,
      projectId: detail.ticket.project_id,
      ticketId: id,
      messageType: 'ticket_update',
      message: String(body.message || ''),
      userId: auth.user.id,
    });
    return NextResponse.json(communication);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to send message' }, { status: 400 });
  }
}
