import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { assessCandidate } from '@/lib/recruitment/service';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const { id } = await params;
    const result = await assessCandidate(id, auth.user.id);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Assessment failed' }, { status: 500 });
  }
}
