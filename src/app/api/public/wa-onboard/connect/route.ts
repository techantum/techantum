import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePortalUser } from '@/lib/whatsapp-provider/portal-auth';
import { ensurePortalWorkspace, getPortalWhatsAppAssets } from '@/lib/whatsapp-provider/services/self-onboard';
import { completeEmbeddedSignup } from '@/lib/whatsapp-provider/services/onboarding';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/security/rateLimiter';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
  await ensurePortalWorkspace(user);

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
      accessToken: body.accessToken ? String(body.accessToken) : undefined,
      wabaId: body.wabaId ? String(body.wabaId) : undefined,
      phoneNumberId: body.phoneNumberId ? String(body.phoneNumberId) : undefined,
      businessId: body.businessId ? String(body.businessId) : undefined,
      actorId: auth.user.id,
    });
    const assets = await getPortalWhatsAppAssets(auth.clientId);
    return NextResponse.json({ ...result, ...assets });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'WhatsApp connection failed' }, { status: 400 });
  }
}
