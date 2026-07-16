import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAndSendLoginOtp, isPartnerOtpEnabled } from '@/lib/partner/otp';

export async function POST() {
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
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!partnerUser || partnerUser.status !== 'active') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (isPartnerOtpEnabled()) {
    const result = await createAndSendLoginOtp(
      partnerUser.id,
      partnerUser.email,
      partnerUser.full_name
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ otpRequired: true });
  }

  await adminSupabase
    .from('partner_users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', partnerUser.id);

  return NextResponse.json({ otpRequired: false });
}
