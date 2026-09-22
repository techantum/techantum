import { NextResponse } from 'next/server';
import { getGbpOAuthCredentials } from '@/lib/gbp/oauth';
import { getMetaProviderConfig } from '@/lib/whatsapp-provider/config';
import { getWhatsAppAiConfig } from '@/lib/whatsapp/config';

export const dynamic = 'force-dynamic';

async function facebookAppIdFromWhatsAppToken() {
  const cfg = getWhatsAppAiConfig();
  if (!cfg.accessToken) return '';
  const res = await fetch(`https://graph.facebook.com/${cfg.graphVersion}/app?access_token=${encodeURIComponent(cfg.accessToken)}`, {
    cache: 'no-store',
  });
  const body = (await res.json().catch(() => ({}))) as { id?: string };
  return body.id || '';
}

export async function GET() {
  const [gbp, metaAppId] = await Promise.all([
    getGbpOAuthCredentials().catch(() => ({ clientId: '' })),
    facebookAppIdFromWhatsAppToken().catch(() => ''),
  ]);
  const meta = getMetaProviderConfig();
  return NextResponse.json({
    googleClientId: gbp.clientId || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() || '',
    facebookAppId: meta.publicAppId || meta.appId || metaAppId || process.env.NEXT_PUBLIC_META_APP_ID?.trim() || '',
    facebookSdkVersion: meta.graphVersion || process.env.WHATSAPP_API_VERSION?.trim() || 'v21.0',
  });
}
