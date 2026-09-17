import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { discoverGbpLocationCatalog } from '@/lib/gbp/client';
import { exchangeGbpOAuthCode, saveGbpOAuthLocation, saveGbpOAuthTokens } from '@/lib/gbp/oauth';

export const dynamic = 'force-dynamic';

function adminRedirect(query: string) {
  return NextResponse.redirect(new URL(`/admin/gbp-analytics?${query}`, 'https://techantum.com'));
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');
  if (oauthError) {
    return adminRedirect(`oauthError=${encodeURIComponent(oauthError)}`);
  }
  if (!code || !state) {
    return adminRedirect('oauthError=Missing+OAuth+code');
  }

  const cookieStore = await cookies();
  const expected = cookieStore.get('gbp_oauth_state')?.value;
  if (!expected || expected !== state) {
    return adminRedirect('oauthError=OAuth+state+mismatch.+Try+Connect+again.');
  }

  try {
    const { refreshToken, googleEmail } = await exchangeGbpOAuthCode(code);
    await saveGbpOAuthTokens({
      refreshToken,
      googleEmail,
      updatedBy: auth.user.id,
    });

    const catalog = await discoverGbpLocationCatalog();
    const preferred =
      catalog.locations.find((loc) => /techantum/i.test(loc.title)) ||
      catalog.locations.find((loc) => /madhapur|hyderabad/i.test(loc.address)) ||
      catalog.locations[0];

    if (preferred) {
      await saveGbpOAuthLocation({
        locationId: preferred.locationId,
        locationTitle: preferred.title,
        accountName: preferred.accountName,
        mapsUri: preferred.mapsUri,
      });
    }

    const response = adminRedirect(
      preferred
        ? `connected=1&location=${encodeURIComponent(preferred.locationId)}`
        : 'connected=1&needLocation=1'
    );
    response.cookies.set('gbp_oauth_state', '', { path: '/', maxAge: 0 });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OAuth connect failed';
    return adminRedirect(`oauthError=${encodeURIComponent(message)}`);
  }
}
