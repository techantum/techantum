import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { listLeadDiscoveryRuns, runLeadSearch, saveLeadSearchRun } from '@/lib/places/service';
import type { PhoneFilter, WebsiteFilter } from '@/lib/places/types';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  try {
    return NextResponse.json(await listLeadDiscoveryRuns());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load runs' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  try {
    const body = await request.json();

    if (body.search) {
      const saved = await saveLeadSearchRun(body.search, auth.user.id);
      return NextResponse.json(saved);
    }

    const search = await runLeadSearch({
      city: body.city,
      area: String(body.area || '').trim(),
      segment: String(body.segment || '').trim(),
      minRating: body.minRating != null && body.minRating !== '' ? Number(body.minRating) : null,
      hasWebsite: (body.hasWebsite as WebsiteFilter) || 'any',
      hasPhone: (body.hasPhone as PhoneFilter) || 'any',
    });

    const saved = await saveLeadSearchRun(search, auth.user.id);
    return NextResponse.json(saved);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Save failed' },
      { status: 400 }
    );
  }
}
