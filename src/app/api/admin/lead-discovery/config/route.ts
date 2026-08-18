import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { DEFAULT_CITY, HYDERABAD_AREAS, LEAD_SEGMENTS } from '@/lib/places/config';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  return NextResponse.json({
    defaultCity: DEFAULT_CITY,
    areas: HYDERABAD_AREAS,
    segments: LEAD_SEGMENTS,
  });
}
