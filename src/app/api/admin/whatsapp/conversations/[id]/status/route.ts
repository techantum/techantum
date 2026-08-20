import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { logAudit, updateConversationStatus } from '@/lib/whatsapp/admin-service';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const { id } = await params;
    const body = (await request.json()) as { lead_stage?: string; status?: string };
    const data = await updateConversationStatus(id, body);
    await logAudit('update_conversation_status', 'conversation', id, auth.user.id, body);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 400 });
  }
}
