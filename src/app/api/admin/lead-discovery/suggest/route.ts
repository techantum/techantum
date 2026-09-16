import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getMapPlaceDetails, suggestMapPlaces, type PlaceSuggestKind } from '@/lib/places/autocomplete';
import { filterGooglePlaceSegments } from '@/lib/places/place-types';

const KINDS = new Set<PlaceSuggestKind>(['country', 'state', 'city', 'area']);

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  try {
    const body = await request.json();

    if (body.placeId) {
      return NextResponse.json(await getMapPlaceDetails(String(body.placeId)));
    }

    if (body.kind === 'segment') {
      const rows = filterGooglePlaceSegments(String(body.query || '')).slice(0, 40).map((item) => ({
        placeId: item.value,
        label: item.label,
        description: 'Google Maps place type',
        types: [item.value],
      }));
      return NextResponse.json({ suggestions: rows });
    }

    const kind = body.kind as PlaceSuggestKind;
    if (!KINDS.has(kind)) {
      return NextResponse.json({ error: 'Invalid location type' }, { status: 400 });
    }

    const suggestions = await suggestMapPlaces({
      query: String(body.query || ''),
      kind,
      regionCode: body.regionCode || null,
      latitude: body.latitude != null ? Number(body.latitude) : null,
      longitude: body.longitude != null ? Number(body.longitude) : null,
    });

    return NextResponse.json({ suggestions });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Google Maps lookup failed' },
      { status: 400 }
    );
  }
}
