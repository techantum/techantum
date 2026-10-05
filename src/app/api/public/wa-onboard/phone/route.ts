import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePortalUser } from '@/lib/whatsapp-provider/portal-auth';
import { ensurePortalWorkspace } from '@/lib/whatsapp-provider/services/self-onboard';
import {
  addPortalPhoneNumber,
  registerPortalPhone,
  requestPortalPhoneCode,
  verifyPortalPhoneCode,
} from '@/lib/whatsapp-provider/services/onboarding';

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

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || '');
  try {
    if (action === 'add') {
      return NextResponse.json(
        await addPortalPhoneNumber(auth.clientId, {
          cc: String(body.cc || ''),
          phoneNumber: String(body.phoneNumber || ''),
          verifiedName: String(body.verifiedName || ''),
          actorId: auth.user.id,
        }),
      );
    }
    if (action === 'request_code') {
      return NextResponse.json(
        await requestPortalPhoneCode(auth.clientId, {
          phoneNumberId: String(body.phoneNumberId || ''),
          method: body.method === 'VOICE' ? 'VOICE' : 'SMS',
        }),
      );
    }
    if (action === 'verify') {
      return NextResponse.json(
        await verifyPortalPhoneCode(auth.clientId, {
          phoneNumberId: String(body.phoneNumberId || ''),
          code: String(body.code || ''),
          actorId: auth.user.id,
        }),
      );
    }
    if (action === 'register') {
      return NextResponse.json(
        await registerPortalPhone(auth.clientId, {
          phoneNumberId: String(body.phoneNumberId || ''),
          pin: String(body.pin || ''),
          actorId: auth.user.id,
        }),
      );
    }
    return NextResponse.json({ error: 'Unknown phone action.' }, { status: 400 });
  } catch (err) {
    const status = typeof err === 'object' && err && 'status' in err ? Number((err as { status?: number }).status) || 400 : 400;
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Phone action failed.' }, { status });
  }
}
