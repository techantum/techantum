import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/security/rateLimiter';
import { validateCSRFToken } from '@/lib/security/csrf';
import { getGbpOAuthCredentials } from '@/lib/gbp/oauth';
import { issueSiteSessionForUser, jsonError } from '@/lib/auth/site-session';

export const dynamic = 'force-dynamic';

async function googleCredentials() {
  const { clientId, clientSecret } = await getGbpOAuthCredentials();
  return {
    clientId: clientId || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() || '',
    clientSecret: clientSecret || process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() || process.env.GBP_OAUTH_CLIENT_SECRET?.trim() || '',
  };
}

async function sessionFromGoogleProfile(email: string, name?: string, sub?: string, verified?: boolean) {
  return issueSiteSessionForUser({
    email,
    name,
    method: 'google',
    metadata: { google_sub: sub, email_verified: Boolean(verified) },
  });
}

export async function POST(request: Request) {
  const identifier = getRateLimitIdentifier(request);
  const rateLimit = checkRateLimit(`site_login_google:${identifier}`, { maxRequests: 20, windowMs: 15 * 60 * 1000 });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  if (!body.csrfToken || !(await validateCSRFToken(String(body.csrfToken)))) {
    return NextResponse.json({ error: 'Invalid security token. Please refresh the page.' }, { status: 403 });
  }

  const code = String(body.code || '').trim();
  const accessToken = String(body.accessToken || body.credential || '').trim();
  if (!code && !accessToken) {
    return NextResponse.json({ error: 'Google sign-in did not return a token. Please try again.' }, { status: 400 });
  }

  try {
    const { clientId, clientSecret } = await googleCredentials();

    if (code) {
      if (!clientId || !clientSecret) {
        throw Object.assign(new Error('Google sign-in is not configured.'), { status: 400 });
      }
      const oauth = new OAuth2Client({ clientId, clientSecret, redirectUri: 'postmessage' });
      const { tokens } = await oauth.getToken(code);
      if (tokens.id_token) {
        const ticket = await oauth.verifyIdToken({ idToken: tokens.id_token, audience: clientId });
        const payload = ticket.getPayload();
        if (!payload?.email) throw Object.assign(new Error('Google did not share an email address.'), { status: 400 });
        const session = await sessionFromGoogleProfile(payload.email, payload.name, payload.sub, payload.email_verified);
        return NextResponse.json({ ok: true, tokenHash: session.tokenHash });
      }
      if (!tokens.access_token) {
        throw Object.assign(new Error('Google did not return a sign-in token.'), { status: 400 });
      }
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
        cache: 'no-store',
      });
      const profile = (await profileRes.json().catch(() => ({}))) as { email?: string; name?: string; sub?: string; email_verified?: boolean };
      if (!profile.email) throw Object.assign(new Error('Google did not share an email address.'), { status: 400 });
      const session = await sessionFromGoogleProfile(profile.email, profile.name, profile.sub, profile.email_verified);
      return NextResponse.json({ ok: true, tokenHash: session.tokenHash });
    }

    const infoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`, {
      cache: 'no-store',
    });
    const info = (await infoRes.json().catch(() => ({}))) as { aud?: string; azp?: string };
    if (!infoRes.ok) {
      throw Object.assign(new Error('Google could not verify that sign-in. Please try again.'), { status: 400 });
    }
    if (clientId && info.aud !== clientId && info.azp !== clientId) {
      throw Object.assign(new Error('Google sign-in was issued for a different app. Please contact TechAntum.'), { status: 400 });
    }
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    const profile = (await profileRes.json().catch(() => ({}))) as { email?: string; name?: string; sub?: string; email_verified?: boolean };
    if (!profile.email) {
      throw Object.assign(new Error('Google did not share an email address. Use another Google account or WhatsApp OTP.'), { status: 400 });
    }
    const session = await sessionFromGoogleProfile(profile.email, profile.name, profile.sub, profile.email_verified);
    return NextResponse.json({ ok: true, tokenHash: session.tokenHash });
  } catch (err) {
    const { error, status } = jsonError(err);
    return NextResponse.json({ error }, { status });
  }
}
