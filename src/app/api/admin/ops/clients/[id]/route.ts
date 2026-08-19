import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getClient, updateClient } from '@/lib/ops/service';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const { id } = await params;
    const detail = await getClient(id);
    if (!detail) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    return NextResponse.json(detail);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to load client' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const { id } = await params;
    const body = await request.json();
    return NextResponse.json(await updateClient(id, body, auth.user.id));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to update client' }, { status: 400 });
  }
}
