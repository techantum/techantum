import { NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/security/rateLimiter';
import { validateCSRFToken } from '@/lib/security/csrf';
import { verifyWhatsAppLoginOtp } from '@/lib/whatsapp-provider/login-otp';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const identifier = getRateLimitIdentifier(request);
  const rateLimit = checkRateLimit(`site_login_otp_verify:${identifier}`, { maxRequests: 20, windowMs: 15 * 60 * 1000 });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  if (!body.csrfToken || !(await validateCSRFToken(String(body.csrfToken)))) {
    return NextResponse.json({ error: 'Invalid security token. Please refresh the page.' }, { status: 403 });
  }

  try {
    const result = await verifyWhatsAppLoginOtp(String(body.phone || ''), String(body.code || ''));
    return NextResponse.json({ ok: true, tokenHash: result.tokenHash });
  } catch (err) {
    const status = typeof err === 'object' && err && 'status' in err ? Number((err as { status?: number }).status) || 400 : 400;
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not verify the code.' }, { status });
  }
}
