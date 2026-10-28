import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { publicAppUrl } from '@/lib/brand';
import { googleProfileFromCode } from '@/lib/saas/google-oauth';
import { afterAuthPath, completeOAuthLogin, setSaasCookie } from '@/lib/saas/session';
import { createAuthAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const origin = publicAppUrl();
  const url = new URL(request.url);
  const jar = await cookies();
  const expected = jar.get('hookooh_google_state')?.value || '';
  const packageId = jar.get('hookooh_google_package')?.value || '';
  const state = url.searchParams.get('state') || '';
  const code = url.searchParams.get('code') || '';
  const fail = (message: string) => NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}&package=${packageId}`, origin));
  if (!code || !expected || state !== expected) return fail('Google sign-in was cancelled.');
  try {
    const profile = await googleProfileFromCode(code);
    const auth = createAuthAdminClient();
    let userId = '';
    const created = await auth.auth.admin.createUser({
      email: profile.email,
      email_confirm: true,
      user_metadata: { full_name: profile.name, login_method: 'google', app: 'hookooh' },
    });
    userId = created.data.user?.id || '';
    if (!userId) {
      const link = await auth.auth.admin.generateLink({ type: 'magiclink', email: profile.email });
      userId = link.data.user?.id || '';
    }
    if (!userId) throw new Error(created.error?.message || 'Could not open your Google account.');
    const result = await completeOAuthLogin({ userId, email: profile.email, name: profile.name, packageId });
    const response = NextResponse.redirect(new URL(afterAuthPath(packageId, result.account), origin));
    await setSaasCookie(response, result.userId);
    response.cookies.set('hookooh_google_state', '', { path: '/', maxAge: 0 });
    response.cookies.set('hookooh_google_package', '', { path: '/', maxAge: 0 });
    return response;
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Google sign-in failed.');
  }
}
