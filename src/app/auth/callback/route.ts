import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    if (data.user) {
      const adminSupabase = createAdminClient();
      const { data: partnerUser } = await adminSupabase
        .from('partner_users')
        .select('status')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (partnerUser?.status === 'active') {
        return NextResponse.redirect(`${origin}/partner/dashboard`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/admin`);
}
