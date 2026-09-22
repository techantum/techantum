import { NextResponse } from 'next/server';
import { getMetaProviderConfig } from '@/lib/whatsapp-provider/config';
import { newOAuthState } from '@/lib/gbp/oauth';
import { metaHostedEmbeddedSignupUrl, publicSiteOrigin } from '@/lib/auth/public-origin';
import { resolveFacebookAppId } from '@/lib/auth/facebook-login';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const origin = publicSiteOrigin();
  const mode = new URL(request.url).searchParams.get('mode') === 'existing' ? 'existing' : 'new';
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login?next=/portal/wa/onboard', origin));
  }

  try {
    const appId = await resolveFacebookAppId();
    const meta = getMetaProviderConfig();
    const configId = meta.embeddedSignupConfigId || '1088312177523729';
    if (!appId) {
      return NextResponse.redirect(new URL(`/portal/wa/onboard?error=${encodeURIComponent('Meta app ID is not configured.')}`, origin));
    }
    const state = `waonboard_${mode}_${newOAuthState()}`;
    const url = metaHostedEmbeddedSignupUrl({ appId, configId, state, mode });

    const response = NextResponse.redirect(url);
    response.cookies.set('wa_meta_oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: origin.startsWith('https://'),
      path: '/',
      maxAge: 600,
    });
    response.cookies.set('wa_meta_oauth_mode', mode, {
      httpOnly: true,
      sameSite: 'lax',
      secure: origin.startsWith('https://'),
      path: '/',
      maxAge: 600,
    });
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not start Meta onboarding.';
    return NextResponse.redirect(new URL(`/portal/wa/onboard?error=${encodeURIComponent(message)}`, origin));
  }
}
