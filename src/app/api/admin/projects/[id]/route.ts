import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { deleteProject, getProject, updateProject } from '@/lib/client-requirements/service';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const { id } = await context.params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  return NextResponse.json(project);
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const { id } = await context.params;
  try {
    const project = await updateProject(id, await request.json());
    return NextResponse.json(project);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Update failed' }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const { id } = await context.params;
  await deleteProject(id);
  return NextResponse.json({ ok: true });
}
