import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { resolveGbpCredentials } from '@/lib/gbp/config';
import { listGbpAccounts, listGbpLocations } from '@/lib/gbp/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function noStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    },
  });
}

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  if (!resolveGbpCredentials()) {
    return noStore(
      {
        ok: false,
        error:
          'No service account credentials found. Set GA4_SERVICE_ACCOUNT_JSON (or GBP_SERVICE_ACCOUNT_JSON), add that email as Manager on Google Business Profile, then try again.',
        accounts: [],
        locations: [],
      },
      400
    );
  }

  try {
    const accounts = await listGbpAccounts();
    const locations = [];

    for (const account of accounts) {
      const rows = await listGbpLocations(account.name);
      for (const loc of rows) {
        const locationId = loc.name?.split('/').pop() ?? loc.name;
        locations.push({
          accountName: account.name,
          accountDisplayName: account.accountName ?? account.name,
          locationName: loc.name,
          locationId,
          title: loc.title ?? 'Untitled location',
          address: [
            ...(loc.storefrontAddress?.addressLines ?? []),
            loc.storefrontAddress?.locality,
            loc.storefrontAddress?.administrativeArea,
            loc.storefrontAddress?.postalCode,
          ]
            .filter(Boolean)
            .join(', '),
          mapsUri: loc.metadata?.mapsUri ?? null,
          placeId: loc.metadata?.placeId ?? null,
        });
      }
    }

    return noStore({
      ok: true,
      accounts: accounts.map((a) => ({
        name: a.name,
        accountName: a.accountName,
        type: a.type,
      })),
      locations,
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : 'Failed to list GBP locations';
    const permissionDenied = /PERMISSION_DENIED|sufficient permissions|403/i.test(raw);
    const quotaExceeded = /Quota exceeded|RESOURCE_EXHAUSTED|rateLimitExceeded|429/i.test(raw);
    const serviceEmail =
      process.env.GBP_CLIENT_EMAIL?.trim() || process.env.GA4_CLIENT_EMAIL?.trim();

    return noStore(
      {
        ok: false,
        error: quotaExceeded
          ? [
              'GBP Account Management API quota is blocked for this Cloud project.',
              'If quota is 0 QPM, submit Application for Basic API Access:',
              'https://support.google.com/business/contact/api_default',
              'Do not retry Discover for a few minutes. Location is already set in GBP_LOCATION_ID.',
            ].join(' ')
          : permissionDenied
            ? [
                'Cannot list Business Profile locations with the current service account.',
                serviceEmail
                  ? `Add ${serviceEmail} as Manager in business.google.com → Users.`
                  : 'Add the service account as Manager on the Business Profile.',
                'Also enable Account Management API + Business Information API in Google Cloud Console.',
              ].join(' ')
            : raw,
        errorCode: quotaExceeded ? 'quota' : permissionDenied ? 'permission' : 'unknown',
        accounts: [],
        locations: [],
      },
      quotaExceeded ? 429 : 502
    );
  }
}
