import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeNextPath } from '@/lib/auth/safe-next';
import { ensureClientWorkspace } from '@/lib/whatsapp-provider/services/self-onboard';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const next = safeNextPath(typeof body.next === 'string' ? body.next : null);

  const admin = createAdminClient();
  const { data: partnerUser } = await admin
    .from('partner_users')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle();
  if (partnerUser) {
    if (partnerUser.status === 'active') {
      return NextResponse.json({ next: '/partner/dashboard' });
    }
    return NextResponse.json({ error: 'Your partner account is not active yet.' }, { status: 403 });
  }

  const { data: adminUser } = await admin.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
  if (adminUser) {
    return NextResponse.json({ next: '/admin' });
  }

  try {
    await ensureClientWorkspace(user);
  } catch {
    return NextResponse.json(
      { error: 'Signed in, but the workspace could not be prepared. Please try again.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ next });
}
