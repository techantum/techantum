import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { listSubmittedRequirements } from '@/lib/client-requirements/service';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const url = new URL(request.url);
  return NextResponse.json(await listSubmittedRequirements({
    status: url.searchParams.get('status') ?? undefined,
    search: url.searchParams.get('search') ?? undefined,
  }));
}
