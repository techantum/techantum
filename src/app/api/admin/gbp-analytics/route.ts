import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import {
  getGbpDateRange,
  isGbpReady,
  resolveGbpCredentials,
  type AnalyticsCustomDates,
  type AnalyticsRange,
} from '@/lib/gbp/config';
import { parseCustomDates } from '@/lib/analytics/ga4-config';
import { fetchGbpAnalytics } from '@/lib/gbp/reports';
import { discoverGbpLocationCatalog, gbpServiceEmail, pendingGbpInviteMessage } from '@/lib/gbp/client';
import { getGbpOAuthStatus } from '@/lib/gbp/oauth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_RANGES = new Set<AnalyticsRange>([
  'today',
  'yesterday',
  '7d',
  'week',
  '28d',
  'month',
  '90d',
  'custom',
]);

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

function setupError() {
  const hasCreds = Boolean(resolveGbpCredentials());
  const hasLocation = Boolean(process.env.GBP_LOCATION_ID?.trim());
  const serviceEmail = gbpServiceEmail() || 'your-service-account@….iam.gserviceaccount.com';

  if (!hasCreds) {
    return [
      'GBP credentials are missing.',
      'Reuse GA4_SERVICE_ACCOUNT_JSON / GA4_CLIENT_EMAIL + GA4_PRIVATE_KEY, or set GBP_SERVICE_ACCOUNT_JSON.',
      `Then in Google Business Profile → Users, add ${serviceEmail} as Manager.`,
    ].join(' ');
  }

  if (!hasLocation) {
    return [
      'GBP credentials are present, but GBP_LOCATION_ID is missing.',
      'Open Admin → Maps Analytics → Discover locations (or call /api/admin/gbp-analytics/locations),',
      'copy the location ID, set GBP_LOCATION_ID, and restart the app.',
    ].join(' ');
  }

  return 'GBP is not fully configured.';
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const url = new URL(request.url);
  const range = parseRange(url.searchParams.get('range'));
  let custom: AnalyticsCustomDates | undefined;

  const oauth = await getGbpOAuthStatus();
  const ready = await isGbpReady();

  if (range === 'custom') {
    const parsed = parseCustomDates(url.searchParams.get('from'), url.searchParams.get('to'));
    if (!parsed.ok) {
      return noStore(
        {
          configured: ready,
          range: getGbpDateRange('28d'),
          error: parsed.error,
          summary: null,
          daily: [],
          oauth,
        },
        400
      );
    }
    custom = { from: parsed.from, to: parsed.to };
  }

  if (!ready) {
    return noStore({
      configured: false,
      range: getGbpDateRange(range, custom),
      error: oauth.clientId && oauth.hasClientSecret
        ? 'Click Connect Owner Google login and sign in with the Google account that owns Techantum Solutions on Maps.'
        : setupError(),
      summary: null,
      daily: [],
      serviceEmail: gbpServiceEmail(),
      hasCredentials: Boolean(resolveGbpCredentials()),
      hasLocationId: Boolean(oauth.locationId),
      oauth,
    });
  }

  try {
    const report = await fetchGbpAnalytics(range, custom);
    return noStore({ ...report, oauth });
  } catch (error) {
    const raw = error instanceof Error ? error.message : 'Failed to load GBP analytics';
    const permissionDenied = /PERMISSION_DENIED|sufficient permissions|403/i.test(raw);
    const notFound = /NOT_FOUND|entity was not found|\b404\b/i.test(raw);
    const quotaExceeded =
      /Quota exceeded|RESOURCE_EXHAUSTED|rateLimitExceeded|429/i.test(raw);
    const unavailable = /UNAVAILABLE|No connection established|EAI_AGAIN|ENOTFOUND|ECONNREFUSED/i.test(
      raw
    );
    const serviceEmail = gbpServiceEmail();
    const projectHint =
      raw.match(/project_number:(\d+)/)?.[1] ||
      process.env.GOOGLE_CLOUD_PROJECT_NUMBER?.trim() ||
      null;

    let errorCode: 'quota' | 'permission' | 'not_found' | 'unavailable' | 'unknown' = 'unknown';
    let message = raw;
    let discoveredLocations: Awaited<ReturnType<typeof discoverGbpLocationCatalog>>['locations'] =
      [];

    if (quotaExceeded) {
      errorCode = 'quota';
      message = [
        'Google Business Profile API quota is blocked for this Cloud project.',
        projectHint ? `Project number: ${projectHint}.` : null,
        'In Google Cloud Console → APIs & Services → Quotas, check Business Profile Performance API.',
        'If Requests per minute is 0, Google has not approved GBP API access yet.',
        'Apply here: https://support.google.com/business/contact/api_default (choose “Application for Basic API Access”).',
        'Requirements: verified GBP (60+ days), website on the listing, and use an email that is Owner/Manager on the GBP.',
        'Until approved, use Performance metrics inside business.google.com. Stop clicking Discover/Refresh for a few minutes to avoid more quota errors.',
      ]
        .filter(Boolean)
        .join(' ');
    } else if (permissionDenied) {
      errorCode = 'permission';
      message = [
        'GBP credentials are set, but this account cannot read the Business Profile.',
        serviceEmail
          ? `In business.google.com → Users, add ${serviceEmail} as Manager (Owner also works).`
          : 'Add your service account email as Manager on the Google Business Profile.',
        'Enable Business Profile Performance API, Account Management API, and Business Information API in Google Cloud.',
        'Changes can take a few minutes to apply.',
      ]
        .filter(Boolean)
        .join(' ');
    } else if (notFound) {
      errorCode = 'not_found';
      try {
        const catalog = await discoverGbpLocationCatalog();
        discoveredLocations = catalog.locations;
        if (catalog.pendingInviteBlocked || catalog.invitations.length > 0) {
          errorCode = 'permission';
          message = pendingGbpInviteMessage(catalog.invitations, catalog.inviteAcceptError);
        } else if (discoveredLocations.length > 0) {
          message = [
            `GBP_LOCATION_ID ${process.env.GBP_LOCATION_ID?.trim() || ''} is not a valid listing id.`,
            'Use the numeric location ID from Discover locations (not the Maps cid= value).',
          ].join(' ');
        } else {
          errorCode = 'permission';
          message = [
            'The Google service account is not a Manager on the Techantum Business Profile, so no listings are visible.',
            serviceEmail
              ? `In business.google.com → People and access, add ${serviceEmail} as Manager.`
              : 'Add the service account email as Manager on the Business Profile.',
            'Wait a few minutes, then click Discover locations.',
          ].join(' ');
        }
      } catch {
        discoveredLocations = [];
        errorCode = 'permission';
        message = [
          'The Google service account is not a Manager on the Techantum Business Profile, so no listings are visible.',
          serviceEmail
            ? `In business.google.com → People and access, add ${serviceEmail} as Manager.`
            : 'Add the service account email as Manager on the Business Profile.',
        ].join(' ');
      }
    } else if (unavailable) {
      errorCode = 'unavailable';
      message =
        'Could not reach Google Business Profile APIs from this server. Check outbound HTTPS, then restart without HTTP(S)_PROXY.';
    }

    return noStore(
      {
        configured: true,
        range: getGbpDateRange(range, custom),
        error: message,
        errorCode,
        serviceEmail,
        locationId: oauth.locationId || process.env.GBP_LOCATION_ID?.trim() || undefined,
        profileUrl: oauth.mapsUri || process.env.GBP_PROFILE_URL?.trim() || undefined,
        discoveredLocations: discoveredLocations.length ? discoveredLocations : undefined,
        oauth,
        summary: null,
        daily: [],
      },
      quotaExceeded ? 429 : 502
    );
  }
}
