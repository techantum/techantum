import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { buildLeadDiscoveryWorkbook, exportFilename } from '@/lib/places/export';
import { buildLeadDiscoveryCsv } from '@/lib/places/sheet-data';
import type { LeadDiscoveryResult, LeadDiscoveryRun, LeadSearchResponse } from '@/lib/places/types';

function previewRun(search: LeadSearchResponse, name?: string): LeadDiscoveryRun {
  return {
    id: 'preview',
    created_by: null,
    name: name || `${search.filters.segment} · ${search.filters.area}`,
    city: search.filters.city,
    area: search.filters.area,
    segment: search.filters.segment,
    text_query: search.text_query,
    min_rating: search.filters.minRating ?? null,
    has_website_filter: search.filters.hasWebsite ?? 'any',
    has_phone_filter: search.filters.hasPhone ?? 'any',
    raw_count: search.raw_count,
    result_count: search.result_count,
    created_at: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  try {
    const body = await request.json();
    const search = body.search as LeadSearchResponse | undefined;
    if (!search?.results) {
      return NextResponse.json({ error: 'Search results are required' }, { status: 400 });
    }

    const run = previewRun(search, typeof body.name === 'string' ? body.name : '');
    const results = search.results as LeadDiscoveryResult[];
    const format = body.format === 'csv' || body.format === 'sheets' ? 'csv' : 'xlsx';

    if (format === 'csv') {
      const csv = buildLeadDiscoveryCsv(results);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${exportFilename(run, 'csv')}"`,
        },
      });
    }

    const buffer = await buildLeadDiscoveryWorkbook(run, results);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${exportFilename(run)}"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Export failed' },
      { status: 500 }
    );
  }
}
