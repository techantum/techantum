import { NextResponse } from 'next/server';
import { googleProfileFromCode } from '@/lib/saas/google-oauth';
import { afterAuthPath, completeOAuthLogin, setSaasCookie } from '@/lib/saas/session';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const code = String(body.code || '').trim();
    const packageId = body.packageId ? String(body.packageId) : '';
    if (!code) return NextResponse.json({ error: 'Google sign-in was cancelled.' }, { status: 400 });
    const profile = await googleProfileFromCode(code, 'postmessage');
    const auth = createAdminClient();
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
    const response = NextResponse.json({ ok: true, next: afterAuthPath(packageId, result.account) });
    await setSaasCookie(response, result.userId);
    return response;
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Google sign-in failed.' }, { status: 400 });
  }
}
