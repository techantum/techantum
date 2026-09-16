import { PRIORITY_LABELS } from './priority';
import type { LeadDiscoveryResult, LeadDiscoveryResultRow, LeadDiscoveryRun } from './types';

export const LEAD_SHEET_HEADERS = [
  'Priority',
  'Business Name',
  'Phone',
  'Website',
  'Rating',
  'Reviews',
  'Address',
  'Area',
  'Segment',
  'City',
  'Type',
  'Google Maps',
  'Place ID',
  'Status',
  'Notes',
] as const;

export function slugifyExportName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'leads';
}

export function defaultSearchName(input: {
  city?: string;
  area?: string;
  segment?: string;
  state?: string;
  country?: string;
}) {
  const segment = input.segment?.trim() || 'Leads';
  const area = input.area?.trim();
  const city = input.city?.trim();
  const place = area && area !== city ? area : city;
  return [segment, place, city && area && area !== city ? city : '', input.state?.trim(), input.country?.trim()]
    .filter(Boolean)
    .join(' · ');
}

export function displaySearchName(run: Pick<LeadDiscoveryRun, 'name' | 'segment' | 'area' | 'city'>) {
  return run.name?.trim() || defaultSearchName(run) || 'Saved search';
}

export function exportBaseName(run: Pick<LeadDiscoveryRun, 'name' | 'city' | 'area' | 'segment' | 'created_at'>) {
  const date = run.created_at ? new Date(run.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  return `leads-${slugifyExportName(displaySearchName(run))}-${date}`;
}

export function leadToSheetRow(row: LeadDiscoveryResult | LeadDiscoveryResultRow) {
  const saved = row as LeadDiscoveryResultRow;
  return [
    PRIORITY_LABELS[row.priority] || row.priority,
    row.business_name,
    row.phone ?? '',
    row.website_uri ?? '',
    row.rating ?? '',
    row.review_count ?? '',
    row.formatted_address ?? '',
    row.area,
    row.segment,
    row.city,
    row.primary_type ?? '',
    row.google_maps_uri ?? '',
    row.place_id,
    saved.lead_status ?? '',
    saved.notes ?? '',
  ];
}

function escapeDelimited(value: unknown, delimiter: string) {
  const text = String(value ?? '');
  if (text.includes('"') || text.includes('\n') || text.includes(delimiter)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function joinSheet(rows: ReadonlyArray<ReadonlyArray<unknown>>, delimiter: string) {
  return rows.map((row) => row.map((cell) => escapeDelimited(cell, delimiter)).join(delimiter)).join('\n');
}

export function buildLeadDiscoveryDelimited(
  results: Array<LeadDiscoveryResult | LeadDiscoveryResultRow>,
  delimiter: ',' | '\t'
) {
  return joinSheet([ [...LEAD_SHEET_HEADERS], ...results.map(leadToSheetRow)], delimiter);
}

export function buildLeadDiscoveryCsv(results: Array<LeadDiscoveryResult | LeadDiscoveryResultRow>) {
  return `\uFEFF${buildLeadDiscoveryDelimited(results, ',')}`;
}

export function buildLeadDiscoveryTsv(results: Array<LeadDiscoveryResult | LeadDiscoveryResultRow>) {
  return buildLeadDiscoveryDelimited(results, '\t');
}

export function downloadTextFile(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
