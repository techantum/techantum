import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { buildGbpOAuthUrl, newOAuthState } from '@/lib/gbp/oauth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  try {
    const state = newOAuthState();
    const url = await buildGbpOAuthUrl(state);
    const response = NextResponse.redirect(url);
    response.cookies.set('gbp_oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 600,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not start Google login';
    return NextResponse.redirect(
      new URL(`/admin/gbp-analytics?oauthError=${encodeURIComponent(message)}`, 'https://techantum.com')
    );
  }
}
