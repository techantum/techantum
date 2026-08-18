import { createAdminClient } from '@/lib/supabase/admin';
import { searchPlacesTextQuery } from './client';
import { buildTextQuery, DEFAULT_CITY, DEFAULT_REGION } from './config';
import { computeLeadPriority } from './priority';
import type {
  LeadDiscoveryResult,
  LeadDiscoveryResultRow,
  LeadDiscoveryRun,
  LeadSearchFilters,
  LeadSearchResponse,
  PhoneFilter,
  WebsiteFilter,
} from './types';

function passesFilter(
  row: LeadDiscoveryResult,
  filters: { minRating?: number | null; hasWebsite?: WebsiteFilter; hasPhone?: PhoneFilter }
) {
  if (filters.minRating != null && filters.minRating > 0) {
    if (row.rating == null || row.rating < filters.minRating) return false;
  }
  const hasWebsite = Boolean(row.website_uri?.trim());
  if (filters.hasWebsite === 'yes' && !hasWebsite) return false;
  if (filters.hasWebsite === 'no' && hasWebsite) return false;
  const hasPhone = Boolean(row.phone?.trim());
  if (filters.hasPhone === 'yes' && !hasPhone) return false;
  if (filters.hasPhone === 'no' && hasPhone) return false;
  return true;
}

function dedupeByPlaceId<T extends { place_id: string }>(rows: T[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (!row.place_id || seen.has(row.place_id)) return false;
    seen.add(row.place_id);
    return true;
  });
}

function sortResults(rows: LeadDiscoveryResult[]) {
  const priorityOrder = { high: 0, medium: 1, normal: 2 };
  return [...rows].sort((a, b) => {
    const p = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (p !== 0) return p;
    return (b.review_count ?? 0) - (a.review_count ?? 0);
  });
}

export async function runLeadSearch(input: LeadSearchFilters): Promise<LeadSearchResponse> {
  const city = input.city?.trim() || DEFAULT_CITY;
  const area = input.area.trim();
  const segment = input.segment.trim();
  if (!area || !segment) throw new Error('Area and segment are required.');

  const text_query = buildTextQuery(segment, area, city);
  const raw = await searchPlacesTextQuery(text_query, DEFAULT_REGION);

  const mapped: LeadDiscoveryResult[] = raw.map((row) => ({
    ...row,
    priority: computeLeadPriority(row),
    city,
    area,
    segment,
  }));

  const deduped = dedupeByPlaceId(mapped);
  const filtered = deduped.filter((row) =>
    passesFilter(row, {
      minRating: input.minRating,
      hasWebsite: input.hasWebsite ?? 'any',
      hasPhone: input.hasPhone ?? 'any',
    })
  );

  return {
    text_query,
    filters: { ...input, city, area, segment },
    raw_count: raw.length,
    result_count: filtered.length,
    results: sortResults(filtered),
  };
}

export async function saveLeadSearchRun(
  search: LeadSearchResponse,
  createdBy?: string
): Promise<{ run: LeadDiscoveryRun; results: LeadDiscoveryResultRow[] }> {
  const supabase = createAdminClient();
  const { data: run, error: runError } = await supabase
    .from('lead_discovery_runs')
    .insert({
      created_by: createdBy ?? null,
      city: search.filters.city,
      area: search.filters.area,
      segment: search.filters.segment,
      text_query: search.text_query,
      min_rating: search.filters.minRating ?? null,
      has_website_filter: search.filters.hasWebsite ?? 'any',
      has_phone_filter: search.filters.hasPhone ?? 'any',
      raw_count: search.raw_count,
      result_count: search.result_count,
    })
    .select('*')
    .single();

  if (runError || !run) throw new Error(runError?.message || 'Failed to save search run');

  if (search.results.length === 0) {
    return { run: run as LeadDiscoveryRun, results: [] };
  }

  const rows = search.results.map((result) => ({
    run_id: run.id,
    place_id: result.place_id,
    business_name: result.business_name,
    formatted_address: result.formatted_address,
    primary_type: result.primary_type,
    types: result.types,
    latitude: result.latitude,
    longitude: result.longitude,
    google_maps_uri: result.google_maps_uri,
    phone: result.phone,
    website_uri: result.website_uri,
    rating: result.rating,
    review_count: result.review_count,
    business_status: result.business_status,
    priority: result.priority,
    city: result.city,
    area: result.area,
    segment: result.segment,
  }));

  const { data: saved, error: saveError } = await supabase
    .from('lead_discovery_results')
    .insert(rows)
    .select('*');

  if (saveError) throw new Error(saveError.message);

  return { run: run as LeadDiscoveryRun, results: (saved ?? []) as LeadDiscoveryResultRow[] };
}

export async function listLeadDiscoveryRuns(limit = 50) {
  const { data, error } = await createAdminClient()
    .from('lead_discovery_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as LeadDiscoveryRun[];
}

export async function getLeadDiscoveryRun(id: string) {
  const supabase = createAdminClient();
  const { data: run, error: runError } = await supabase
    .from('lead_discovery_runs')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (runError) throw new Error(runError.message);
  if (!run) return null;

  const { data: results, error: resultsError } = await supabase
    .from('lead_discovery_results')
    .select('*')
    .eq('run_id', id)
    .order('priority', { ascending: true })
    .order('review_count', { ascending: false });

  if (resultsError) throw new Error(resultsError.message);

  const priorityOrder = { high: 0, medium: 1, normal: 2 };
  const sorted = [...((results ?? []) as LeadDiscoveryResultRow[])].sort((a, b) => {
    const p = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (p !== 0) return p;
    return (b.review_count ?? 0) - (a.review_count ?? 0);
  });

  return { run: run as LeadDiscoveryRun, results: sorted };
}

export async function updateLeadResultStatus(id: string, lead_status: string, notes?: string) {
  const payload: Record<string, unknown> = { lead_status };
  if (notes !== undefined) payload.notes = notes;
  const { data, error } = await createAdminClient()
    .from('lead_discovery_results')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as LeadDiscoveryResultRow;
}
