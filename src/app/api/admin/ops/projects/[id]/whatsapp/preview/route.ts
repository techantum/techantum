import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { previewProjectUpdate, previewProjectWelcome } from '@/lib/ops/service';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const kind = body.kind === 'welcome' ? 'welcome' : 'update';
    const preview = kind === 'welcome' ? await previewProjectWelcome(id) : await previewProjectUpdate(id, body.status_or_update);
    return NextResponse.json(preview);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to preview message' }, { status: 400 });
  }
}
