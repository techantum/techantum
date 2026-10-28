import type { ResolvedChannel } from '@/lib/youtube/client';
import type { ResearchPlatform } from './platforms';

const USER_AGENT = 'Hookooh/1.0 (research page typeahead; https://hookooh.com)';

type WikiKind = Extract<ResearchPlatform, 'facebook' | 'instagram' | 'linkedin'>;

const PROPERTY: Record<WikiKind, string> = {
  facebook: 'P2013',
  instagram: 'P2003',
  linkedin: 'P4264',
};

function pageUrl(kind: WikiKind, handle: string) {
  if (kind === 'instagram') return `https://www.instagram.com/${handle}/`;
  if (kind === 'linkedin') return `https://www.linkedin.com/company/${handle}/`;
  return `https://www.facebook.com/${handle}`;
}

function asPage(kind: WikiKind, name: string, handle: string, image: string | null): ResolvedChannel {
  return {
    youtubeChannelId: handle,
    channelName: name || handle,
    channelHandle: handle,
    channelUrl: pageUrl(kind, handle),
    description: null,
    thumbnailUrl: image,
    uploadsPlaylistId: null,
    subscriberCount: null,
    videoCount: null,
    viewCount: null,
    publishedAt: null,
    country: null,
    publicDetails: { platform: kind, source: 'wikidata' },
  };
}

async function sparqlPages(kind: WikiKind, query: string): Promise<ResolvedChannel[]> {
  const property = PROPERTY[kind];
  const sparql = `SELECT DISTINCT ?item ?itemLabel ?page ?image WHERE {
  SERVICE wikibase:mwapi {
    bd:serviceParam wikibase:api "EntitySearch" .
    bd:serviceParam wikibase:endpoint "www.wikidata.org" .
    bd:serviceParam mwapi:search "${query.replace(/["\\]/g, ' ')}" .
    bd:serviceParam mwapi:language "en" .
    bd:serviceParam mwapi:limit "20" .
    ?item wikibase:apiOutputItem mwapi:item .
  }
  ?item wdt:${property} ?page .
  OPTIONAL { ?item wdt:P18 ?image . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
} LIMIT 20`;
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`;
  const response = await fetch(url, {
    headers: { Accept: 'application/sparql-results+json', 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return [];
  const body = (await response.json()) as {
    results?: { bindings?: { itemLabel?: { value?: string }; page?: { value?: string }; image?: { value?: string } }[] };
  };
  const rows: ResolvedChannel[] = [];
  const seen = new Set<string>();
  for (const row of body.results?.bindings || []) {
    const handle = String(row.page?.value || '').replace(/^https?:\/\/(www\.)?facebook\.com\//i, '').replace(/\/+$/, '');
    if (!handle || seen.has(handle.toLowerCase())) continue;
    seen.add(handle.toLowerCase());
    const image = row.image?.value ? `${row.image.value}${row.image.value.includes('?') ? '&' : '?'}width=120` : null;
    rows.push(asPage(kind, String(row.itemLabel?.value || handle), handle, image));
  }
  return rows;
}

type WikiEntity = {
  id?: string;
  labels?: { en?: { value?: string } };
  claims?: Record<string, { mainsnak?: { datavalue?: { value?: unknown } } }[]>;
};

function claimValue(entity: WikiEntity, property: string) {
  const value = entity.claims?.[property]?.[0]?.mainsnak?.datavalue?.value;
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'id' in value) return String((value as { id?: string }).id || '');
  return '';
}

function commonsThumb(entity: WikiEntity) {
  const file = claimValue(entity, 'P18');
  if (!file) return null;
  const name = file.replace(/^File:/i, '');
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}?width=120`;
}

async function restPages(kind: WikiKind, query: string): Promise<ResolvedChannel[]> {
  const searchUrl = new URL('https://www.wikidata.org/w/api.php');
  searchUrl.searchParams.set('action', 'wbsearchentities');
  searchUrl.searchParams.set('search', query);
  searchUrl.searchParams.set('language', 'en');
  searchUrl.searchParams.set('limit', '15');
  searchUrl.searchParams.set('format', 'json');
  searchUrl.searchParams.set('origin', '*');
  const search = await fetch(searchUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
  if (!search.ok) return [];
  const found = (await search.json()) as { search?: { id?: string }[] };
  const ids = (found.search || []).map((row) => row.id).filter(Boolean).join('|');
  if (!ids) return [];
  const getUrl = new URL('https://www.wikidata.org/w/api.php');
  getUrl.searchParams.set('action', 'wbgetentities');
  getUrl.searchParams.set('ids', ids);
  getUrl.searchParams.set('props', 'labels|claims');
  getUrl.searchParams.set('languages', 'en');
  getUrl.searchParams.set('format', 'json');
  getUrl.searchParams.set('origin', '*');
  const get = await fetch(getUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
  if (!get.ok) return [];
  const body = (await get.json()) as { entities?: Record<string, WikiEntity> };
  const rows: ResolvedChannel[] = [];
  const seen = new Set<string>();
  const property = PROPERTY[kind];
  for (const entity of Object.values(body.entities || {})) {
    const handle = claimValue(entity, property);
    if (!handle || seen.has(handle.toLowerCase())) continue;
    seen.add(handle.toLowerCase());
    rows.push(asPage(kind, String(entity.labels?.en?.value || handle), handle, commonsThumb(entity)));
  }
  return rows;
}

export async function searchWikidataPages(platform: ResearchPlatform, query: string): Promise<ResolvedChannel[]> {
  if (platform !== 'facebook' && platform !== 'instagram' && platform !== 'linkedin') return [];
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const rows = await sparqlPages(platform, q);
    if (rows.length) return rows;
  } catch {
    /* Wikidata SPARQL may time out; fall back to the entity search API. */
  }
  try {
    return await restPages(platform, q);
  } catch {
    return [];
  }
}
