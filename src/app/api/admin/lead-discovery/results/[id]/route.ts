import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { updateLeadResultStatus } from '@/lib/places/service';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const updated = await updateLeadResultStatus(id, body.lead_status, body.notes);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 400 }
    );
  }
}
