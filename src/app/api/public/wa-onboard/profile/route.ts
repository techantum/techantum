import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensurePortalWorkspace, updateBusinessProfile } from '@/lib/whatsapp-provider/services/self-onboard';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 });
  try {
    await ensurePortalWorkspace(user);
    const body = (await request.json()) as {
      companyName?: string;
      website?: string;
      email?: string;
      businessCategory?: string;
      businessType?: string;
      address?: string;
      country?: string;
      timezone?: string;
      description?: string;
    };
    const session = await updateBusinessProfile(user.id, body);
    return NextResponse.json({ ok: true, session });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not save details' }, { status: 400 });
  }
}
