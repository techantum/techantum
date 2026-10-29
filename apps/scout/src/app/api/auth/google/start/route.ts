import { NextResponse } from 'next/server';
import { publicAppUrl } from '@/lib/brand';
import { googleAuthUrl, googleCredentials } from '@/lib/saas/google-oauth';

export async function GET(request: Request) {
  const origin = publicAppUrl();
  const packageId = new URL(request.url).searchParams.get('package') || '';
  const { clientId, clientSecret } = await googleCredentials();
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL(`/subscriber/login?error=${encodeURIComponent('Google sign-in is not configured.')}&package=${packageId}`, origin));
  }
  const state = `hookooh_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const response = NextResponse.redirect(googleAuthUrl(state, clientId));
  const cookie = { httpOnly: true, sameSite: 'lax' as const, secure: origin.startsWith('https://'), path: '/', maxAge: 600 };
  response.cookies.set('hookooh_google_state', state, cookie);
  response.cookies.set('hookooh_google_package', packageId, cookie);
  return response;
}
