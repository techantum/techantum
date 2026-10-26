import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const PLACE_DETAILS_URL = 'https://places.googleapis.com/v1/places';

export type PlaceSuggestKind = 'country' | 'state' | 'city' | 'area';

export interface PlaceSuggestion {
  placeId: string;
  label: string;
  description: string;
  types: string[];
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  formattedAddress: string | null;
  country: string | null;
  countryCode: string | null;
  state: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

type AutocompletePrediction = {
  placePrediction?: {
    placeId?: string;
    text?: { text?: string };
    structuredFormat?: {
      mainText?: { text?: string };
      secondaryText?: { text?: string };
    };
    types?: string[];
  };
};

type AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

function getApiKey() {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!key) throw new Error('GOOGLE_PLACES_API_KEY is not configured in environment variables.');
  return key;
}

function includedTypes(kind: PlaceSuggestKind) {
  if (kind === 'country') return ['country'];
  if (kind === 'state') return ['administrative_area_level_1'];
  if (kind === 'area') return ['sublocality'];
  return ['locality'];
}

function parseSuggestions(suggestions?: AutocompletePrediction[]): PlaceSuggestion[] {
  return (suggestions ?? [])
    .map((row) => {
      const prediction = row.placePrediction;
      if (!prediction?.placeId) return null;
      const label = prediction.structuredFormat?.mainText?.text || prediction.text?.text || '';
      const description = prediction.structuredFormat?.secondaryText?.text || prediction.text?.text || '';
      if (!label) return null;
      return {
        placeId: prediction.placeId,
        label,
        description: description === label ? '' : description,
        types: prediction.types ?? [],
      };
    })
    .filter((row): row is PlaceSuggestion => Boolean(row));
}

async function autocompleteRequest(input: {
  query: string;
  types: string[];
  regionCode?: string | null;
}): Promise<PlaceSuggestion[]> {
  const body: Record<string, unknown> = {
    input: input.query,
    languageCode: 'en',
    includedPrimaryTypes: input.types,
    includeQueryPredictions: false,
  };
  if (input.regionCode) body.includedRegionCodes = [input.regionCode.toUpperCase()];

  const res = await fetch(AUTOCOMPLETE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': getApiKey(),
      'X-Goog-FieldMask':
        'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types',
    },
    body: JSON.stringify(body),
  });

  const payload = (await res.json()) as {
    suggestions?: AutocompletePrediction[];
    error?: { message?: string; status?: string };
  };

  if (!res.ok) {
    throw new Error(payload.error?.message || `Google Maps autocomplete failed (${res.status})`);
  }

  return parseSuggestions(payload.suggestions);
}

export async function suggestMapPlaces(input: {
  query: string;
  kind: PlaceSuggestKind;
  regionCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<PlaceSuggestion[]> {
  const query = input.query.trim();
  if (query.length < 1) return [];

  if (input.kind === 'area') {
    const looksLikePin = /^\d{3,}$/.test(query.replace(/\s/g, ''));
    const requests = looksLikePin
      ? [autocompleteRequest({ query, types: ['postal_code'], regionCode: input.regionCode })]
      : [
          autocompleteRequest({ query, types: ['sublocality'], regionCode: input.regionCode }),
          autocompleteRequest({ query, types: ['postal_code'], regionCode: input.regionCode }),
        ];

    const batches = await Promise.allSettled(requests);
    const rows = batches.flatMap((batch) => (batch.status === 'fulfilled' ? batch.value : []));
    const seen = new Set<string>();
    return rows.filter((row) => {
      const key = `${row.label.toLowerCase()}|${row.description}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  return autocompleteRequest({
    query,
    types: includedTypes(input.kind),
    regionCode: input.regionCode,
  });
}

export async function getMapPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const id = placeId.replace(/^places\//, '');
  const res = await fetch(`${PLACE_DETAILS_URL}/${encodeURIComponent(id)}`, {
    headers: {
      'X-Goog-Api-Key': getApiKey(),
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,addressComponents,location',
    },
  });

  const payload = (await res.json()) as {
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    addressComponents?: AddressComponent[];
    location?: { latitude?: number; longitude?: number };
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(payload.error?.message || `Google Maps place details failed (${res.status})`);
  }

  const component = (type: string) => payload.addressComponents?.find((item) => item.types?.includes(type));

  return {
    placeId: id,
    name: payload.displayName?.text?.trim() || '',
    formattedAddress: payload.formattedAddress ?? null,
    country: component('country')?.longText ?? null,
    countryCode: component('country')?.shortText ?? null,
    state: component('administrative_area_level_1')?.longText ?? null,
    city:
      component('locality')?.longText ||
      component('postal_town')?.longText ||
      component('administrative_area_level_3')?.longText ||
      null,
    latitude: payload.location?.latitude ?? null,
    longitude: payload.location?.longitude ?? null,
  };
}
