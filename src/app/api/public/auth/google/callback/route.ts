import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeGoogleLoginCode, siteGoogleRedirectUri } from '@/lib/gbp/oauth';
import { issueSiteSessionForUser } from '@/lib/auth/site-session';
import { safeNextPath } from '@/lib/auth/safe-next';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error_description') || url.searchParams.get('error');

  const fail = (message: string) =>
    NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}&google=1`, origin));

  if (oauthError) return fail(oauthError);
  if (!code || !state) return fail('Google sign-in was cancelled.');

  const cookieStore = await cookies();
  const expected = cookieStore.get('site_google_oauth_state')?.value;
  if (!expected || expected !== state) {
    return fail('Google sign-in expired. Please try again.');
  }
  const next = safeNextPath(cookieStore.get('site_google_next')?.value);

  try {
    const profile = await exchangeGoogleLoginCode(code, siteGoogleRedirectUri(origin));
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
    if (error) return fail(error.message);
    const response = NextResponse.redirect(new URL(next, origin));
    response.cookies.set('site_google_oauth_state', '', { path: '/', maxAge: 0 });
    response.cookies.set('site_google_next', '', { path: '/', maxAge: 0 });
    return response;
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Google sign-in failed.');
  }
}
