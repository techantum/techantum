import { NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/security/rateLimiter';
import { validateCSRFToken } from '@/lib/security/csrf';
import { getMetaProviderConfig } from '@/lib/whatsapp-provider/config';
import { issueSiteSessionForUser, jsonError } from '@/lib/auth/site-session';

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

  const accessToken = String(body.accessToken || '').trim();
  if (!accessToken) {
    return NextResponse.json({ error: 'Facebook sign-in was cancelled. Please try again.' }, { status: 400 });
  }

  try {
    const meta = getMetaProviderConfig();
    const profileRes = await fetch(
      `https://graph.facebook.com/${meta.graphVersion || 'v21.0'}/me?fields=id,name,email&access_token=${encodeURIComponent(accessToken)}`,
      { cache: 'no-store' }
    );
    const profile = (await profileRes.json().catch(() => ({}))) as {
      id?: string;
      name?: string;
      email?: string;
      error?: { message?: string };
    };
    if (!profileRes.ok || !profile.id) {
      throw Object.assign(new Error(profile.error?.message || 'Facebook could not verify that sign-in.'), { status: 400 });
    }

    const email = profile.email || `fb${profile.id}@facebook.techantum.local`;
    const session = await issueSiteSessionForUser({
      email,
      name: profile.name,
      method: 'facebook',
      metadata: { facebook_id: profile.id },
    });
    return NextResponse.json({ ok: true, tokenHash: session.tokenHash });
  } catch (err) {
    const { error, status } = jsonError(err);
    return NextResponse.json({ error }, { status });
  }
}
