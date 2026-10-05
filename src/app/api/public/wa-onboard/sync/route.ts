import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePortalUser } from '@/lib/whatsapp-provider/portal-auth';
import { ensurePortalWorkspace } from '@/lib/whatsapp-provider/services/self-onboard';
import { refreshPortalFromMeta } from '@/lib/whatsapp-provider/services/onboarding';

export const dynamic = 'force-dynamic';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
  await ensurePortalWorkspace(user);
  const auth = await requirePortalUser('whatsapp.onboarding.manage');
  if ('error' in auth && auth.error) return auth.error;
  try {
    const result = await refreshPortalFromMeta(auth.clientId, auth.user.id);
    return NextResponse.json(result);
  } catch (err) {
    const status = typeof err === 'object' && err && 'status' in err ? Number((err as { status?: number }).status) || 400 : 400;
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not refresh Meta data.' }, { status });
  }
}
