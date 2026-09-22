import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/security/rateLimiter';
import { validateCSRFToken } from '@/lib/security/csrf';
import { exchangeFacebookCode, issueFacebookSession } from '@/lib/auth/facebook-login';
import { jsonError } from '@/lib/auth/site-session';
import { safeNextPath } from '@/lib/auth/safe-next';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const identifier = getRateLimitIdentifier(request);
  const rateLimit = checkRateLimit(`site_login_facebook:${identifier}`, { maxRequests: 20, windowMs: 15 * 60 * 1000 });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  if (!body.csrfToken || !(await validateCSRFToken(String(body.csrfToken)))) {
    return NextResponse.json({ error: 'Invalid security token. Please refresh the page.' }, { status: 403 });
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get('site_facebook_oauth_state')?.value;
  const state = String(body.state || '').trim();
  if (!expectedState || expectedState !== state) {
    return NextResponse.json({ error: 'Facebook sign-in expired. Please try again.' }, { status: 400 });
  }

  const accessToken = String(body.accessToken || '').trim();
  const code = String(body.code || '').trim();
  if (!accessToken && !code) {
    return NextResponse.json({ error: 'Facebook sign-in was cancelled. Please try again.' }, { status: 400 });
  }

  try {
    const token = accessToken || (await exchangeFacebookCode(code));
    const session = await issueFacebookSession(token);
    const next = safeNextPath(cookieStore.get('site_facebook_next')?.value);
    const response = NextResponse.json({ ok: true, tokenHash: session.tokenHash, next });
    response.cookies.set('site_facebook_oauth_state', '', { path: '/', maxAge: 0 });
    response.cookies.set('site_facebook_next', '', { path: '/', maxAge: 0 });
    return response;
  } catch (err) {
    const { error, status } = jsonError(err);
    return NextResponse.json({ error }, { status });
  }
}
