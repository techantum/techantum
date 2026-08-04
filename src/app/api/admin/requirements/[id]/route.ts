import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getAdminRequirement, updateRequirementStatus } from '@/lib/client-requirements/service';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const { id } = await context.params;
  try {
    return NextResponse.json(await getAdminRequirement(id));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Not found' }, { status: 404 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const { id } = await context.params;
  const body = await request.json();
  return NextResponse.json(await updateRequirementStatus(id, body.status, body.note, auth.user.id));
}
