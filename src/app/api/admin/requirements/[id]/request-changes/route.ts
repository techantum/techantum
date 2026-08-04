import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { requestRequirementChanges } from '@/lib/client-requirements/service';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const { id } = await context.params;
  const body = await request.json();
  return NextResponse.json(await requestRequirementChanges({
    requirementId: id,
    sections: body.sections ?? [],
    comment: body.comment,
    adminUserId: auth.user.id,
  }));
}
