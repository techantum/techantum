import { getMetaProviderConfig } from '@/lib/whatsapp-provider/config';
import { getWhatsAppAiConfig } from '@/lib/whatsapp/config';
import { issueSiteSessionForUser } from '@/lib/auth/site-session';
import { facebookLoginRedirectUri } from '@/lib/auth/public-origin';

export async function resolveFacebookAppId() {
  const meta = getMetaProviderConfig();
  if (meta.publicAppId || meta.appId) return meta.publicAppId || meta.appId;
  const cfg = getWhatsAppAiConfig();
  if (!cfg.accessToken) return '';
  const res = await fetch(`https://graph.facebook.com/${cfg.graphVersion}/app?access_token=${encodeURIComponent(cfg.accessToken)}`, {
    cache: 'no-store',
  });
  const body = (await res.json().catch(() => ({}))) as { id?: string };
  return body.id || '';
}

export async function facebookProfileFromToken(accessToken: string) {
  const meta = getMetaProviderConfig();
  const profileRes = await fetch(
    `https://graph.facebook.com/${meta.graphVersion || 'v21.0'}/me?fields=id,name,email&access_token=${encodeURIComponent(accessToken)}`,
    { cache: 'no-store' }
  );
  const profile = (await profileRes.json().catch(() => ({}))) as {
    id?: string;
    name?: string;
    email?: string;
    error?: { message?: string };
  };
  if (!profileRes.ok || !profile.id) {
    throw Object.assign(new Error(profile.error?.message || 'Facebook could not verify that sign-in.'), { status: 400 });
  }
  return profile;
}

export async function exchangeFacebookCode(code: string) {
  const meta = getMetaProviderConfig();
  const appId = await resolveFacebookAppId();
  if (!appId || !meta.appSecret) {
    throw Object.assign(new Error('Facebook sign-in is not fully configured. Add the Meta App Secret, or enable Login with JavaScript SDK.'), {
      status: 400,
    });
  }
  const url = new URL(`https://graph.facebook.com/${meta.graphVersion || 'v21.0'}/oauth/access_token`);
  url.searchParams.set('client_id', appId);
  url.searchParams.set('client_secret', meta.appSecret);
  url.searchParams.set('redirect_uri', facebookLoginRedirectUri());
  url.searchParams.set('code', code);
  const res = await fetch(url, { cache: 'no-store' });
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; error?: { message?: string } };
  if (!res.ok || !body.access_token) {
    throw Object.assign(new Error(body.error?.message || 'Facebook did not return a sign-in token.'), { status: 400 });
  }
  return body.access_token;
}

export async function issueFacebookSession(accessToken: string) {
  const profile = await facebookProfileFromToken(accessToken);
  return issueSiteSessionForUser({
    email: profile.email || `fb${profile.id}@facebook.techantum.local`,
    name: profile.name,
    method: 'facebook',
    metadata: { facebook_id: profile.id },
  });
}
