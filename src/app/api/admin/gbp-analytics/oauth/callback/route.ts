import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { discoverGbpLocationCatalog } from '@/lib/gbp/client';
import { exchangeGbpOAuthCode, exchangeGoogleLoginCode, gbpOAuthRedirectUri, saveGbpOAuthLocation, saveGbpOAuthTokens } from '@/lib/gbp/oauth';
import { publicSiteOrigin } from '@/lib/auth/public-origin';
import { createClient } from '@/lib/supabase/server';
import { issueSiteSessionForUser } from '@/lib/auth/site-session';
import { safeNextPath } from '@/lib/auth/safe-next';

export const dynamic = 'force-dynamic';

function adminRedirect(query: string) {
  return NextResponse.redirect(new URL(`/admin/gbp-analytics?${query}`, 'https://techantum.com'));
}

async function completeSiteGoogleLogin(request: Request, code: string, state: string) {
  const origin = publicSiteOrigin();
  const cookieStore = await cookies();
  const expected = cookieStore.get('site_google_oauth_state')?.value;
  if (!expected || expected !== state) return null;

  const next = safeNextPath(cookieStore.get('site_google_next')?.value);
  try {
    const profile = await exchangeGoogleLoginCode(code, gbpOAuthRedirectUri());
    const issued = await issueSiteSessionForUser({
      email: profile.email,
      name: profile.name,
      method: 'google',
      metadata: { google_sub: profile.sub },
    });
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: issued.tokenHash,
      type: 'magiclink',
    });
    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, origin));
    }
    const response = NextResponse.redirect(new URL(next, origin));
    response.cookies.set('site_google_oauth_state', '', { path: '/', maxAge: 0 });
    response.cookies.set('site_google_next', '', { path: '/', maxAge: 0 });
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Google sign-in failed.';
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, origin));
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');
  const origin = publicSiteOrigin();

  if (state?.startsWith('site_')) {
    if (oauthError) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(oauthError)}`, origin));
    }
    if (!code || !state) {
      return NextResponse.redirect(new URL('/login?error=Google+sign-in+was+cancelled.', origin));
    }
    const siteResult = await completeSiteGoogleLogin(request, code, state);
    if (siteResult) return siteResult;
    return NextResponse.redirect(new URL('/login?error=Google+sign-in+expired.+Please+try+again.', origin));
  }

  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

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
