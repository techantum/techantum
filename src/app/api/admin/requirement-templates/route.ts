import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { deleteTemplate, listTemplates, upsertTemplate } from '@/lib/client-requirements/service';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    return NextResponse.json(await listTemplates());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    return NextResponse.json(await upsertTemplate(await request.json()));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Template save failed' }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    return NextResponse.json(await upsertTemplate(await request.json()));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Template save failed' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  try {
    await deleteTemplate(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Delete failed' },
      { status: 500 }
    );
  }
}
