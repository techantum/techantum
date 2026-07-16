import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { listAllRequirements, getRequirementAnalytics } from '@/lib/partner/requirements';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const url = new URL(request.url);
  const analytics = url.searchParams.get('analytics');

  if (analytics === 'true') {
    const data = await getRequirementAnalytics();
    return NextResponse.json(data);
  }

  const data = await listAllRequirements({
    status: url.searchParams.get('status') ?? undefined,
    partnerId: url.searchParams.get('partnerId') ?? undefined,
    search: url.searchParams.get('search') ?? undefined,
  });

  return NextResponse.json(data);
}
