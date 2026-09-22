import { NextResponse } from 'next/server';
import { requirePortalUser } from '@/lib/whatsapp-provider/portal-auth';
import { completeEmbeddedSignup } from '@/lib/whatsapp-provider/services/onboarding';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/security/rateLimiter';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requirePortalUser('whatsapp.onboarding.manage');
  if ('error' in auth && auth.error) return auth.error;

  const identifier = getRateLimitIdentifier(request);
  const rateLimit = checkRateLimit(`wa_self_connect:${auth.clientId}`, { maxRequests: 10, windowMs: 60 * 60 * 1000 });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many connection attempts. Please try again later.' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  try {
    const result = await completeEmbeddedSignup({
      clientId: auth.clientId,
      code: body.code ? String(body.code) : undefined,
      wabaId: body.wabaId ? String(body.wabaId) : undefined,
      phoneNumberId: body.phoneNumberId ? String(body.phoneNumberId) : undefined,
      businessId: body.businessId ? String(body.businessId) : undefined,
      actorId: auth.user.id,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'WhatsApp connection failed' }, { status: 400 });
  }
}
