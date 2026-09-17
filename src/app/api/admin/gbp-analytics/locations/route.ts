import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { resolveGbpCredentials } from '@/lib/gbp/config';
import { discoverGbpLocationCatalog, gbpServiceEmail, pendingGbpInviteMessage } from '@/lib/gbp/client';
import { getGbpOAuthStatus, saveGbpOAuthLocation } from '@/lib/gbp/oauth';

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

  const oauth = await getGbpOAuthStatus();
  if (!resolveGbpCredentials() && !oauth.hasRefreshToken) {
    return noStore(
      {
        ok: false,
        error:
          'Connect Owner Google login first, or keep service-account credentials configured.',
        accounts: [],
        locations: [],
      },
      400
    );
  }

  try {
    const { accounts, locations, invitations, inviteAcceptError, pendingInviteBlocked } =
      await discoverGbpLocationCatalog();

    return noStore({
      ok: locations.length > 0,
      serviceEmail: gbpServiceEmail(),
      accounts: accounts.map((a) => ({
        name: a.name,
        accountName: a.accountName,
        type: a.type,
      })),
      locations,
      invitations,
      inviteAcceptError,
      pendingInviteBlocked,
      error:
        locations.length > 0
          ? undefined
          : pendingInviteBlocked || invitations.length > 0
            ? pendingGbpInviteMessage(invitations, inviteAcceptError)
            : 'No locations returned yet. Add the service account as Manager on the Business Profile, then retry Discover.',
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : 'Failed to list GBP locations';
    const permissionDenied = /PERMISSION_DENIED|sufficient permissions|403/i.test(raw);
    const quotaExceeded = /Quota exceeded|RESOURCE_EXHAUSTED|rateLimitExceeded|429/i.test(raw);
    const serviceEmail = gbpServiceEmail();

    return noStore(
      {
        ok: false,
        serviceEmail,
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

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const body = (await request.json().catch(() => ({}))) as {
    locationId?: string;
    locationTitle?: string;
    accountName?: string;
    mapsUri?: string | null;
  };
  if (!body.locationId?.trim()) {
    return noStore({ ok: false, error: 'locationId is required' }, 400);
  }

  try {
    await saveGbpOAuthLocation({
      locationId: body.locationId.trim(),
      locationTitle: body.locationTitle,
      accountName: body.accountName,
      mapsUri: body.mapsUri,
    });
    return noStore({ ok: true, locationId: body.locationId.trim() });
  } catch (error) {
    return noStore(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to save location' },
      500
    );
  }
}
