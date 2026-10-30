import { createHmac, randomBytes } from 'node:crypto';

function env(key: string) {
  return process.env[key]?.trim() || '';
}

export function facebookAppId() {
  return env('META_APP_ID') || env('NEXT_PUBLIC_META_APP_ID');
}

export function facebookAppSecret() {
  return env('META_APP_SECRET') || env('META_WHATSAPP_APP_SECRET') || env('WHATSAPP_APP_SECRET');
}

export function facebookOAuthConfigured() {
  return Boolean(facebookAppId() && facebookAppSecret());
}

export function facebookOAuthRedirectUri() {
  const explicit = env('FACEBOOK_PAGE_OAUTH_REDIRECT') || env('META_PAGE_OAUTH_REDIRECT');
  if (explicit) return explicit.replace(/\/$/, '');
  const origin = (env('NEXT_PUBLIC_SITE_URL') || env('NEXT_PUBLIC_REVEALEO_URL') || 'http://localhost:3010').replace(/\/$/, '');
  return `${origin}/api/youtube/meta/facebook/callback`;
}

export const FACEBOOK_PAGE_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'ads_read',
  'business_management',
].join(',');

export function createFacebookOAuthState() {
  return randomBytes(16).toString('hex');
}

export function facebookAuthUrl(state: string) {
  const url = new URL(`https://www.facebook.com/${env('META_GRAPH_API_VERSION') || 'v21.0'}/dialog/oauth`);
  url.searchParams.set('client_id', facebookAppId());
  url.searchParams.set('redirect_uri', facebookOAuthRedirectUri());
  url.searchParams.set('state', state);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', FACEBOOK_PAGE_SCOPES);
  return url.toString();
}

export async function facebookUserTokenFromCode(code: string) {
  const url = new URL(`https://graph.facebook.com/${env('META_GRAPH_API_VERSION') || 'v21.0'}/oauth/access_token`);
  url.searchParams.set('client_id', facebookAppId());
  url.searchParams.set('client_secret', facebookAppSecret());
  url.searchParams.set('redirect_uri', facebookOAuthRedirectUri());
  url.searchParams.set('code', code);
  const first = await fetch(url.toString(), { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
  const body = (await first.json().catch(() => ({}))) as { access_token?: string; error?: { message?: string } };
  if (!first.ok || !body.access_token) throw new Error(body.error?.message || 'Facebook did not return an access token.');
  const longUrl = new URL(`https://graph.facebook.com/${env('META_GRAPH_API_VERSION') || 'v21.0'}/oauth/access_token`);
  longUrl.searchParams.set('grant_type', 'fb_exchange_token');
  longUrl.searchParams.set('client_id', facebookAppId());
  longUrl.searchParams.set('client_secret', facebookAppSecret());
  longUrl.searchParams.set('fb_exchange_token', body.access_token);
  const longLived = await fetch(longUrl.toString(), { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
  const longBody = (await longLived.json().catch(() => ({}))) as { access_token?: string };
  return longBody.access_token || body.access_token;
}

export async function facebookPagesForUser(userToken: string) {
  const url = new URL(`https://graph.facebook.com/${env('META_GRAPH_API_VERSION') || 'v21.0'}/me/accounts`);
  url.searchParams.set('fields', 'id,name,username,access_token');
  url.searchParams.set('limit', '100');
  url.searchParams.set('access_token', userToken);
  const secret = facebookAppSecret();
  if (secret) url.searchParams.set('appsecret_proof', createHmac('sha256', secret).update(userToken).digest('hex'));
  const response = await fetch(url.toString(), { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
  const body = (await response.json().catch(() => ({}))) as { data?: Array<{ id?: string; name?: string; username?: string; access_token?: string }>; error?: { message?: string } };
  if (!response.ok || body.error) throw new Error(body.error?.message || 'Facebook did not return Pages for this login.');
  return Array.isArray(body.data) ? body.data.filter((page) => page.id && page.access_token) : [];
}
