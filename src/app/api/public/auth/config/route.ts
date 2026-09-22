import { NextResponse } from 'next/server';
import { getGbpOAuthCredentials } from '@/lib/gbp/oauth';
import { getMetaProviderConfig } from '@/lib/whatsapp-provider/config';
import { resolveFacebookAppId } from '@/lib/auth/facebook-login';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const [gbp, facebookAppId] = await Promise.all([
    getGbpOAuthCredentials().catch(() => ({ clientId: '' })),
    resolveFacebookAppId().catch(() => ''),
  ]);
  const meta = getMetaProviderConfig();
  return NextResponse.json({
    googleClientId: gbp.clientId || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() || '',
    facebookAppId,
    facebookSdkVersion: meta.graphVersion || process.env.WHATSAPP_API_VERSION?.trim() || 'v21.0',
    googleOrigin: origin,
    googleRedirectUri: `${origin}/api/public/auth/google/callback`,
  });
}
