import { NextResponse } from 'next/server';
import { createGbpOAuthClient, newOAuthState, siteGoogleRedirectUri } from '@/lib/gbp/oauth';
import { safeNextPath } from '@/lib/auth/safe-next';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const next = safeNextPath(url.searchParams.get('next'));
  try {
    const state = `site_${newOAuthState()}`;
    const client = await createGbpOAuthClient(siteGoogleRedirectUri(origin));
    if (!client) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent('Google sign-in is not configured yet.')}`, origin));
    }
    const authUrl = client.generateAuthUrl({
      access_type: 'online',
      prompt: 'select_account',
      scope: ['openid', 'email', 'profile'],
      state,
      include_granted_scopes: false,
    });
    const response = NextResponse.redirect(authUrl);
    const secure = origin.startsWith('https://');
    response.cookies.set('site_google_oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: 600,
    });
    response.cookies.set('site_google_next', next, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: 600,
    });
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not start Google sign-in.';
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, origin));
  }
}
