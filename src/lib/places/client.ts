import { MAX_RESULTS, PAGE_SIZE } from './config';

const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.primaryType',
  'places.types',
  'places.location',
  'places.googleMapsUri',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.businessStatus',
  'nextPageToken',
].join(',');

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  primaryType?: string;
  types?: string[];
  location?: { latitude?: number; longitude?: number };
  googleMapsUri?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
};

function getApiKey() {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!key) throw new Error('GOOGLE_PLACES_API_KEY is not configured in environment variables.');
  return key;
}

function normalizePlaceId(id: string | undefined) {
  if (!id) return '';
  return id.replace(/^places\//, '');
}

export async function searchPlacesTextQuery(textQuery: string, regionCode: string) {
  const apiKey = getApiKey();
  const allPlaces: GooglePlace[] = [];
  let pageToken: string | undefined;
  const target = MAX_RESULTS;

  while (allPlaces.length < target) {
    const body: Record<string, unknown> = {
      textQuery,
      languageCode: 'en',
      regionCode,
      maxResultCount: Math.min(PAGE_SIZE, target - allPlaces.length),
    };
    if (pageToken) body.pageToken = pageToken;

    const res = await fetch(PLACES_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
    });

    const payload = (await res.json()) as {
      places?: GooglePlace[];
      nextPageToken?: string;
      error?: { message?: string; status?: string };
    };

    if (!res.ok) {
      const status = payload.error?.status;
      const raw = payload.error?.message || `Google Places API error (${res.status})`;
      if (status === 'PERMISSION_DENIED' || res.status === 403) {
        throw new Error(
          'Google Places API permission denied. Enable "Places API (New)" in Google Cloud, turn on billing, and ensure your API key is allowed to call it (API restrictions → Places API (New)).'
        );
      }
      throw new Error(raw);
    }

    const batch = payload.places ?? [];
    allPlaces.push(...batch);
    pageToken = payload.nextPageToken;

    if (!pageToken || batch.length === 0) break;
  }

  return allPlaces.map((place) => ({
    place_id: normalizePlaceId(place.id),
    business_name: place.displayName?.text?.trim() || 'Unknown',
    formatted_address: place.formattedAddress ?? null,
    primary_type: place.primaryType ?? null,
    types: place.types ?? [],
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
    google_maps_uri: place.googleMapsUri ?? null,
    phone: place.nationalPhoneNumber || place.internationalPhoneNumber || null,
    website_uri: place.websiteUri ?? null,
    rating: place.rating ?? null,
    review_count: place.userRatingCount ?? null,
    business_status: place.businessStatus ?? null,
  }));
}
