import { NextResponse } from 'next/server';
import { createGbpOAuthClient, gbpOAuthRedirectUri, newOAuthState } from '@/lib/gbp/oauth';
import { safeNextPath } from '@/lib/auth/safe-next';
import { publicSiteOrigin } from '@/lib/auth/public-origin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const origin = publicSiteOrigin();
  const next = safeNextPath(new URL(request.url).searchParams.get('next'));
  try {
    const state = `site_${newOAuthState()}`;
    const client = await createGbpOAuthClient(gbpOAuthRedirectUri());
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
    response.cookies.set('site_google_oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: origin.startsWith('https://'),
      path: '/',
      maxAge: 600,
    });
    response.cookies.set('site_google_next', next, {
      httpOnly: true,
      sameSite: 'lax',
      secure: origin.startsWith('https://'),
      path: '/',
      maxAge: 600,
    });
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not start Google sign-in.';
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, origin));
  }
}
