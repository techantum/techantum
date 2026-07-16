import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyLoginOtp, createAndSendLoginOtp } from '@/lib/partner/otp';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const code = String(body.code || '').trim();

  const adminSupabase = createAdminClient();
  const { data: partnerUser } = await adminSupabase
    .from('partner_users')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!partnerUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const valid = await verifyLoginOtp(partnerUser.id, code);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
  }

  await adminSupabase
    .from('partner_users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', partnerUser.id);

  return NextResponse.json({ ok: true });
}

export async function PUT() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminSupabase = createAdminClient();
  const { data: partnerUser } = await adminSupabase
    .from('partner_users')
    .select('id, email, full_name')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!partnerUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = await createAndSendLoginOtp(
    partnerUser.id,
    partnerUser.email,
    partnerUser.full_name
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
