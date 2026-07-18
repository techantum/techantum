import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getAnalyticsDateRange, isGa4Configured, type AnalyticsRange } from '@/lib/analytics/ga4-config';
import { fetchWebsiteAnalytics } from '@/lib/analytics/ga4-reports';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_RANGES = new Set<AnalyticsRange>(['7d', '28d', '90d']);

function parseRange(value: string | null): AnalyticsRange {
  if (value && VALID_RANGES.has(value as AnalyticsRange)) {
    return value as AnalyticsRange;
  }
  return '28d';
}

function noStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    },
  });
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const url = new URL(request.url);
  const range = parseRange(url.searchParams.get('range'));

  if (!isGa4Configured()) {
    return noStore({
      configured: false,
      range: getAnalyticsDateRange(range),
      error:
        'GA4 API is not configured. Set GA4_PROPERTY_ID plus either GA4_SERVICE_ACCOUNT_JSON or GA4_CLIENT_EMAIL + GA4_PRIVATE_KEY, then grant the service account Viewer access in GA4.',
      summary: null,
      daily: [],
      pages: [],
      locations: [],
    });
  }

  try {
    const report = await fetchWebsiteAnalytics(range);
    return noStore(report);
  } catch (error) {
    const raw = error instanceof Error ? error.message : 'Failed to load analytics';
    const permissionDenied = /PERMISSION_DENIED|sufficient permissions/i.test(raw);
    const unavailable = /UNAVAILABLE|No connection established|EAI_AGAIN|ENOTFOUND|ECONNREFUSED/i.test(
      raw
    );
    const serviceEmail = process.env.GA4_CLIENT_EMAIL?.trim();
    const propertyId = process.env.GA4_PROPERTY_ID?.trim();
    const message = permissionDenied
      ? [
          'GA4 credentials are set, but this service account cannot read the property.',
          serviceEmail
            ? `In Google Analytics → Admin → Property access management, add ${serviceEmail} as Viewer.`
            : 'In Google Analytics → Admin → Property access management, add your service account email as Viewer.',
          propertyId ? `Property ID: ${propertyId}` : null,
          'Changes can take a few minutes to apply.',
        ]
          .filter(Boolean)
          .join(' ')
      : unavailable
        ? 'Could not reach Google Analytics API from this server. Check outbound HTTPS/DNS to analyticsdata.googleapis.com, then restart the app without HTTP(S)_PROXY set.'
        : raw;

    return noStore(
      {
        configured: true,
        range: getAnalyticsDateRange(range),
        error: message,
        summary: null,
        daily: [],
        pages: [],
        locations: [],
      },
      502
    );
  }
}
