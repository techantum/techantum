import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { listConversations } from '@/lib/whatsapp/admin-service';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const rows = await listConversations(search);
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to load conversations' }, { status: 500 });
  }
}
