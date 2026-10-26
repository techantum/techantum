import dns from 'node:dns';
import { MAX_RESULTS, PAGE_SIZE } from './config';

// This VPS has IPv4 allowlisted on the Google key; Node otherwise dials IPv6 first.
dns.setDefaultResultOrder('ipv4first');

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

function formatPlacesApiError(
  httpStatus: number,
  error?: {
    message?: string;
    status?: string;
    details?: { reason?: string; metadata?: { callerIp?: string } }[];
  }
) {
  const reason = error?.details?.find((d) => d.reason)?.reason;
  const callerIp = error?.details?.find((d) => d.metadata?.callerIp)?.metadata?.callerIp;
  const raw = error?.message || `Google Places API error (${httpStatus})`;

  if (reason === 'API_KEY_IP_ADDRESS_BLOCKED' || /IP address restriction/i.test(raw)) {
    const ipHint = callerIp ? ` Current outbound IP: ${callerIp}.` : '';
    return (
      `Google blocked this server IP on the Places API key.${ipHint} ` +
      'In Google Cloud → Credentials → this API key → Application restrictions → IP addresses, add this server IPv4 (and IPv6 if listed).'
    );
  }

  if (error?.status === 'PERMISSION_DENIED' || httpStatus === 403) {
    return (
      'Google Places API permission denied. In Google Cloud: enable "Places API (New)" ' +
      '(APIs & Services → Library), turn on billing, then on this API key set API restrictions to include ' +
      '"Places API (New)" — the legacy "Places API" is not enough. ' +
      (raw && raw !== 'The caller does not have permission' ? `Google said: ${raw}` : '')
    ).trim();
  }

  return raw;
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
      error?: {
        message?: string;
        status?: string;
        details?: { reason?: string; metadata?: { callerIp?: string } }[];
      };
    };

    if (!res.ok) {
      throw new Error(formatPlacesApiError(res.status, payload.error));
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
