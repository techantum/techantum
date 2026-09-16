import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { addConversationNote, getConversationDetail, logAudit } from '@/lib/whatsapp/admin-service';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const { id } = await params;
    const body = (await request.json()) as { body?: string };
    await addConversationNote(id, body.body || '', auth.user.id);
    await logAudit('conversation_note', 'conversation', id, auth.user.id);
    const detail = await getConversationDetail(id);
    return NextResponse.json(detail);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to save note' }, { status: 400 });
  }
}
