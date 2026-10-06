import { NextResponse } from 'next/server';
import { requireLeadDiscoveryAccess } from '@/lib/places/lead-discovery-access';
import { DEFAULT_CITY } from '@/lib/places/config';
import { GOOGLE_PLACE_SEGMENTS } from '@/lib/places/place-types';

export async function GET() {
  const auth = await requireLeadDiscoveryAccess();
  if ('error' in auth) return auth.error;

  return NextResponse.json({
    defaultCity: DEFAULT_CITY,
    defaultCountry: 'India',
    defaultCountryCode: 'IN',
    segments: GOOGLE_PLACE_SEGMENTS,
  });
}
