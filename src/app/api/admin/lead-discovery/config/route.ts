import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { DEFAULT_CITY } from '@/lib/places/config';
import { GOOGLE_PLACE_SEGMENTS } from '@/lib/places/place-types';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  return NextResponse.json({
    defaultCity: DEFAULT_CITY,
    defaultCountry: 'India',
    defaultCountryCode: 'IN',
    segments: GOOGLE_PLACE_SEGMENTS,
  });
}
