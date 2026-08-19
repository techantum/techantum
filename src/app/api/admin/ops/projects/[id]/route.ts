import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getProject } from '@/lib/ops/service';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const { id } = await params;
    const detail = await getProject(id);
    if (!detail) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    return NextResponse.json(detail);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to load project' }, { status: 500 });
  }
}
