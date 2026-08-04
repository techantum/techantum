import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createProject, listProjects } from '@/lib/client-requirements/service';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  try {
    const url = new URL(request.url);
    const data = await listProjects({
      status: url.searchParams.get('status') ?? undefined,
      search: url.searchParams.get('search') ?? undefined,
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  try {
    const body = await request.json();
    const project = await createProject({ ...body, created_by: auth.user.id });
    return NextResponse.json(project);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Create failed' }, { status: 400 });
  }
}
