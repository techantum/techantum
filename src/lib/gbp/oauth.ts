import { randomBytes } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptSecret, encryptSecret, looksLikeMaskedSecret } from '@/lib/ai/crypto';

export const GBP_OAUTH_SCOPE = 'https://www.googleapis.com/auth/business.manage';
export const GBP_OAUTH_SCOPES = [GBP_OAUTH_SCOPE, 'openid', 'email', 'profile'];

export interface GbpOAuthConnection {
  clientId: string | null;
  hasClientSecret: boolean;
  hasRefreshToken: boolean;
  googleEmail: string | null;
  locationId: string | null;
  locationTitle: string | null;
  accountName: string | null;
  mapsUri: string | null;
  connectedAt: string | null;
}

interface GbpOAuthRow {
  client_id: string | null;
  encrypted_client_secret: string | null;
  encrypted_refresh_token: string | null;
  google_email: string | null;
  location_id: string | null;
  location_title: string | null;
  account_name: string | null;
  maps_uri: string | null;
  connected_at: string | null;
}

function siteOrigin() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://techantum.com'
  ).replace(/\/$/, '');
}

export function gbpOAuthRedirectUri() {
  return `${siteOrigin()}/api/admin/gbp-analytics/oauth/callback`;
}

export function siteGoogleRedirectUri(origin: string) {
  return `${origin.replace(/\/$/, '')}/api/admin/gbp-analytics/oauth/callback`;
}

export function newOAuthState() {
  return randomBytes(24).toString('hex');
}

function envClientId() {
  return process.env.GBP_OAUTH_CLIENT_ID?.trim() || process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() || '';
}

function envClientSecret() {
  return process.env.GBP_OAUTH_CLIENT_SECRET?.trim() || process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() || '';
}

async function loadRow(): Promise<GbpOAuthRow | null> {
  const { data, error } = await createAdminClient()
    .from('gbp_oauth_connections')
    .select(
      'client_id, encrypted_client_secret, encrypted_refresh_token, google_email, location_id, location_title, account_name, maps_uri, connected_at'
    )
    .eq('id', 1)
    .maybeSingle();
  if (error) {
    console.warn('[gbp oauth] load failed', error.message);
    return null;
  }
  return (data as GbpOAuthRow | null) ?? null;
}

function decryptOptional(value: string | null | undefined) {
  if (!value?.trim()) return '';
  try {
    return decryptSecret(value).trim();
  } catch {
    return '';
  }
}

export async function getGbpOAuthCredentials() {
  const row = await loadRow();
  const clientId = row?.client_id?.trim() || envClientId();
  const clientSecret = decryptOptional(row?.encrypted_client_secret) || envClientSecret();
  const refreshToken =
    decryptOptional(row?.encrypted_refresh_token) || process.env.GBP_OAUTH_REFRESH_TOKEN?.trim() || '';
  return {
    row,
    clientId,
    clientSecret,
    refreshToken,
  };
}

export async function getGbpOAuthStatus(): Promise<GbpOAuthConnection> {
  const { row, clientId, clientSecret, refreshToken } = await getGbpOAuthCredentials();
  return {
    clientId: clientId || null,
    hasClientSecret: Boolean(clientSecret),
    hasRefreshToken: Boolean(refreshToken),
    googleEmail: row?.google_email ?? null,
    locationId: row?.location_id ?? process.env.GBP_LOCATION_ID?.trim() ?? null,
    locationTitle: row?.location_title ?? null,
    accountName: row?.account_name ?? null,
    mapsUri: row?.maps_uri ?? process.env.GBP_PROFILE_URL?.trim() ?? null,
    connectedAt: row?.connected_at ?? null,
  };
}

export async function saveGbpOAuthClient(input: {
  clientId: string;
  clientSecret?: string;
  updatedBy?: string;
}) {
  const existing = await getGbpOAuthCredentials();
  const clientId = input.clientId.trim();
  const nextSecret = looksLikeMaskedSecret(input.clientSecret || '')
    ? existing.clientSecret
    : input.clientSecret?.trim() || existing.clientSecret;

  if (!/\.apps\.googleusercontent\.com$/i.test(clientId)) {
    throw new Error(
      'OAuth Client ID must look like 123456789-xxxx.apps.googleusercontent.com — not an email address. In Google Cloud → Credentials → OAuth 2.0 Client IDs, open the Web client and copy Client ID.'
    );
  }
  if (!nextSecret) {
    throw new Error('OAuth client secret is required.');
  }
  if (/@/.test(nextSecret) || nextSecret.includes('apps.googleusercontent.com')) {
    throw new Error(
      'That value looks like a Client ID, not a Client secret. Copy Client secret (often starts with GOCSPX-).'
    );
  }

  const { error } = await createAdminClient().from('gbp_oauth_connections').upsert({
    id: 1,
    client_id: clientId,
    encrypted_client_secret: encryptSecret(nextSecret),
    updated_by: input.updatedBy || null,
  });
  if (error) throw new Error(error.message);
}

export async function saveGbpOAuthTokens(input: {
  refreshToken: string;
  googleEmail?: string | null;
  locationId?: string | null;
  locationTitle?: string | null;
  accountName?: string | null;
  mapsUri?: string | null;
  updatedBy?: string;
}) {
  const { error } = await createAdminClient()
    .from('gbp_oauth_connections')
    .update({
      encrypted_refresh_token: encryptSecret(input.refreshToken),
      google_email: input.googleEmail || null,
      location_id: input.locationId || null,
      location_title: input.locationTitle || null,
      account_name: input.accountName || null,
      maps_uri: input.mapsUri || null,
      connected_at: new Date().toISOString(),
      updated_by: input.updatedBy || null,
    })
    .eq('id', 1);
  if (error) throw new Error(error.message);
}

export async function saveGbpOAuthLocation(input: {
  locationId: string;
  locationTitle?: string | null;
  accountName?: string | null;
  mapsUri?: string | null;
}) {
  const { error } = await createAdminClient()
    .from('gbp_oauth_connections')
    .update({
      location_id: input.locationId,
      location_title: input.locationTitle || null,
      account_name: input.accountName || null,
      maps_uri: input.mapsUri || null,
    })
    .eq('id', 1);
  if (error) throw new Error(error.message);
}

export async function clearGbpOAuthTokens() {
  const { error } = await createAdminClient()
    .from('gbp_oauth_connections')
    .update({
      encrypted_refresh_token: null,
      google_email: null,
      location_id: null,
      location_title: null,
      account_name: null,
      maps_uri: null,
      connected_at: null,
    })
    .eq('id', 1);
  if (error) throw new Error(error.message);
}

export async function createGbpOAuthClient(redirectUri = gbpOAuthRedirectUri()) {
  const { clientId, clientSecret } = await getGbpOAuthCredentials();
  if (!clientId || !clientSecret) return null;
  return new OAuth2Client({
    clientId,
    clientSecret,
    redirectUri,
  });
}

export async function getGbpOAuthRequestClient() {
  const { refreshToken } = await getGbpOAuthCredentials();
  if (!refreshToken) return null;
  const client = await createGbpOAuthClient();
  if (!client) return null;
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

export async function buildGbpOAuthUrl(state: string) {
  const client = await createGbpOAuthClient();
  if (!client) {
    throw new Error('GBP OAuth client is not configured. Add the Web client ID and secret first.');
  }
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: true,
    scope: GBP_OAUTH_SCOPES,
    state,
  });
}

export async function exchangeGoogleLoginCode(code: string, redirectUri: string) {
  const client = await createGbpOAuthClient(redirectUri);
  if (!client) {
    throw new Error('Google sign-in is not configured.');
  }
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token && !tokens.id_token) {
    throw new Error('Google did not return a sign-in token.');
  }
  client.setCredentials(tokens);
  let email = '';
  let name = '';
  let sub = '';
  if (tokens.id_token) {
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: (await getGbpOAuthCredentials()).clientId,
    });
    const payload = ticket.getPayload();
    email = payload?.email || '';
    name = payload?.name || '';
    sub = payload?.sub || '';
  }
  if (!email && tokens.access_token) {
    const info = await client.getTokenInfo(tokens.access_token);
    email = info.email || '';
  }
  if (!email) throw new Error('Google did not share an email address.');
  return { email, name, sub };
}

export async function exchangeGbpOAuthCode(code: string) {
  const client = await createGbpOAuthClient();
  if (!client) {
    throw new Error('GBP OAuth client is not configured.');
  }
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      'Google did not return a refresh token. Remove the Techantum CMS app from https://myaccount.google.com/permissions and connect again, choosing the GBP Owner account.'
    );
  }
  client.setCredentials(tokens);
  let googleEmail: string | null = null;
  try {
    const tokenInfo = await client.getTokenInfo(tokens.access_token || '');
    googleEmail = tokenInfo.email || null;
  } catch {
    googleEmail = null;
  }
  return { refreshToken: tokens.refresh_token, googleEmail, client };
}
