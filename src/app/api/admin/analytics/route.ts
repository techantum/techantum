import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getAnalyticsDateRange, isGa4Configured, type AnalyticsRange } from '@/lib/analytics/ga4-config';
import { fetchWebsiteAnalytics } from '@/lib/analytics/ga4-reports';

const VALID_RANGES = new Set<AnalyticsRange>(['7d', '28d', '90d']);

function parseRange(value: string | null): AnalyticsRange {
  if (value && VALID_RANGES.has(value as AnalyticsRange)) {
    return value as AnalyticsRange;
  }
  return '28d';
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const url = new URL(request.url);
  const range = parseRange(url.searchParams.get('range'));

  if (!isGa4Configured()) {
    return NextResponse.json({
      configured: false,
      range: getAnalyticsDateRange(range),
      error:
        'GA4 API is not configured. Add GA4_PROPERTY_ID and GA4_SERVICE_ACCOUNT_JSON to your environment, and grant the service account Viewer access in GA4.',
      summary: null,
      daily: [],
      pages: [],
      locations: [],
    });
  }

  try {
    const report = await fetchWebsiteAnalytics(range);
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load analytics';
    return NextResponse.json(
      {
        configured: true,
        range: getAnalyticsDateRange(range),
        error: message,
        summary: null,
        daily: [],
        pages: [],
        locations: [],
      },
      { status: 502 }
    );
  }
}
