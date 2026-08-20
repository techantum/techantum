import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getConversationDetail } from '@/lib/whatsapp/admin-service';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const { id } = await params;
    const detail = await getConversationDetail(id);
    return NextResponse.json(detail);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Not found' }, { status: 404 });
  }
}
