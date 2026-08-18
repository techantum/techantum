import ExcelJS from 'exceljs';
import { PRIORITY_LABELS } from './priority';
import type { LeadDiscoveryResultRow, LeadDiscoveryRun } from './types';

export async function buildLeadDiscoveryWorkbook(
  run: LeadDiscoveryRun,
  results: LeadDiscoveryResultRow[]
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TechAntum Lead Discovery';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Leads', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = [
    { header: 'Priority', key: 'priority', width: 22 },
    { header: 'Business Name', key: 'business_name', width: 32 },
    { header: 'Phone', key: 'phone', width: 18 },
    { header: 'Website', key: 'website_uri', width: 36 },
    { header: 'Rating', key: 'rating', width: 10 },
    { header: 'Reviews', key: 'review_count', width: 10 },
    { header: 'Address', key: 'formatted_address', width: 42 },
    { header: 'Area', key: 'area', width: 16 },
    { header: 'Segment', key: 'segment', width: 18 },
    { header: 'City', key: 'city', width: 14 },
    { header: 'Type', key: 'primary_type', width: 22 },
    { header: 'Google Maps', key: 'google_maps_uri', width: 40 },
    { header: 'Place ID', key: 'place_id', width: 28 },
    { header: 'Status', key: 'lead_status', width: 14 },
    { header: 'Notes', key: 'notes', width: 30 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

  for (const row of results) {
    sheet.addRow({
      priority: PRIORITY_LABELS[row.priority],
      business_name: row.business_name,
      phone: row.phone ?? '',
      website_uri: row.website_uri ?? '',
      rating: row.rating ?? '',
      review_count: row.review_count ?? '',
      formatted_address: row.formatted_address ?? '',
      area: row.area,
      segment: row.segment,
      city: row.city,
      primary_type: row.primary_type ?? '',
      google_maps_uri: row.google_maps_uri ?? '',
      place_id: row.place_id,
      lead_status: row.lead_status,
      notes: row.notes ?? '',
    });
  }

  const meta = workbook.addWorksheet('Search Info');
  meta.addRows([
    ['Query', run.text_query],
    ['City', run.city],
    ['Area', run.area],
    ['Segment', run.segment],
    ['Min Rating', run.min_rating ?? 'Any'],
    ['Has Website', run.has_website_filter],
    ['Has Phone', run.has_phone_filter],
    ['Raw Results', run.raw_count],
    ['Filtered Results', run.result_count],
    ['Exported At', new Date().toISOString()],
  ]);
  meta.getColumn(1).width = 18;
  meta.getColumn(2).width = 48;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function exportFilename(run: LeadDiscoveryRun) {
  const slug = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const date = new Date(run.created_at).toISOString().slice(0, 10);
  return `leads-${slug(run.city)}-${slug(run.area)}-${slug(run.segment)}-${date}.xlsx`;
}
