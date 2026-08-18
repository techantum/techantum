import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { runLeadSearch } from '@/lib/places/service';
import type { PhoneFilter, WebsiteFilter } from '@/lib/places/types';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  try {
    const body = await request.json();
    const search = await runLeadSearch({
      city: body.city,
      area: String(body.area || '').trim(),
      segment: String(body.segment || '').trim(),
      minRating: body.minRating != null && body.minRating !== '' ? Number(body.minRating) : null,
      hasWebsite: (body.hasWebsite as WebsiteFilter) || 'any',
      hasPhone: (body.hasPhone as PhoneFilter) || 'any',
    });
    return NextResponse.json(search);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Search failed' },
      { status: 400 }
    );
  }
}
