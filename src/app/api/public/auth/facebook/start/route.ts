import { NextResponse } from 'next/server';
import { facebookSiteLoginUrl, publicSiteOrigin } from '@/lib/auth/public-origin';
import { resolveFacebookAppId } from '@/lib/auth/facebook-login';
import { getMetaProviderConfig } from '@/lib/whatsapp-provider/config';
import { newOAuthState } from '@/lib/gbp/oauth';
import { safeNextPath } from '@/lib/auth/safe-next';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const origin = publicSiteOrigin();
  const next = safeNextPath(new URL(request.url).searchParams.get('next'));
  try {
    const appId = await resolveFacebookAppId();
    if (!appId) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent('Facebook sign-in is not configured yet.')}`, origin)
      );
    }
    const meta = getMetaProviderConfig();
    const state = `site_${newOAuthState()}`;
    const authUrl = facebookSiteLoginUrl({
      appId,
      graphVersion: meta.graphVersion || 'v21.0',
      state,
      responseType: meta.appSecret ? 'code' : 'token',
    });
    const response = NextResponse.redirect(authUrl);
    const cookie = {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: origin.startsWith('https://'),
      path: '/',
      maxAge: 600,
    };
    response.cookies.set('site_facebook_oauth_state', state, cookie);
    response.cookies.set('site_facebook_next', next, cookie);
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not start Facebook sign-in.';
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, origin));
  }
}
