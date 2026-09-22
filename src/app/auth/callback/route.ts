import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeNextPath } from '@/lib/auth/safe-next';
import { ensureClientWorkspace } from '@/lib/whatsapp-provider/services/self-onboard';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const oauthError = requestUrl.searchParams.get('error_description') || requestUrl.searchParams.get('error');
  const origin = requestUrl.origin;
  const next = safeNextPath(requestUrl.searchParams.get('next'));

  if (oauthError) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(oauthError)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Sign-in was cancelled. Please try again.')}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error?.message || 'Could not complete sign-in.')}`);
  }

  const adminSupabase = createAdminClient();
  const { data: partnerUser } = await adminSupabase
    .from('partner_users')
    .select('status')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (partnerUser) {
    if (partnerUser.status === 'active') {
      return NextResponse.redirect(`${origin}/partner/dashboard`);
    }
    return NextResponse.redirect(`${origin}/partner/login?error=${encodeURIComponent('Your partner account is not active yet.')}`);
  }

  const { data: adminUser } = await adminSupabase.from('admin_users').select('user_id').eq('user_id', data.user.id).maybeSingle();
  if (adminUser) {
    return NextResponse.redirect(`${origin}/admin`);
  }

  try {
    await ensureClientWorkspace(data.user);
  } catch {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Signed in, but the workspace could not be prepared. Please try again.')}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
