import { NextResponse } from 'next/server';
import { getMetaProviderConfig } from '@/lib/whatsapp-provider/config';
import { newOAuthState } from '@/lib/gbp/oauth';
import { metaHostedEmbeddedSignupUrl, publicSiteOrigin, zeroIntegrationOnboardingUrl } from '@/lib/auth/public-origin';
import { resolveFacebookAppId } from '@/lib/auth/facebook-login';
import { createClient } from '@/lib/supabase/server';
import { getLocalAdminUser } from '@/lib/auth/local-admin-session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const origin = publicSiteOrigin();
  const params = new URL(request.url).searchParams;
  const mode = params.get('mode') === 'existing' ? 'existing' : 'new';
  const flow = params.get('flow') === 'zero' ? 'zero' : 'hosted';
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  const localAdmin = await getLocalAdminUser().catch(() => null);
  if (!user && !localAdmin) {
    return NextResponse.redirect(new URL('/login?next=/portal/wa/onboard', origin));
  }

  try {
    const appId = (await resolveFacebookAppId()) || getMetaProviderConfig().appId;
    const meta = getMetaProviderConfig();
    const configId = meta.embeddedSignupConfigId;
    if (!appId || !configId) {
      return NextResponse.redirect(new URL(`/portal/wa/onboard?error=${encodeURIComponent('Meta app ID or Embedded Signup config is not configured.')}`, origin));
    }

    const url =
      flow === 'zero'
        ? zeroIntegrationOnboardingUrl({ appId, configId })
        : metaHostedEmbeddedSignupUrl({
            appId,
            configId,
            state: `waonboard_${mode}_${newOAuthState()}`,
            mode,
          });

    const response = NextResponse.redirect(url);
    if (flow !== 'zero') {
      const state = url.searchParams.get('state') || '';
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
    }
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not start Meta onboarding.';
    return NextResponse.redirect(new URL(`/portal/wa/onboard?error=${encodeURIComponent(message)}`, origin));
  }
}
