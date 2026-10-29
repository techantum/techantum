import { createAdminClient } from '@/lib/supabase/admin';
import { decryptSecret, encryptSecret } from '@/lib/ai/crypto';
import { publicSiteOrigin } from '@/lib/auth/public-origin';
import { createGbpOAuthClient, newOAuthState } from '@/lib/gbp/oauth';

function envGoogleClientReady() {
  return Boolean(
    (process.env.GBP_OAUTH_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID) &&
      (process.env.GBP_OAUTH_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET),
  );
}

export const GSC_SCOPES = [
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/webmasters',
  'openid',
  'email',
];

export function gscOAuthRedirectUri() {
  return (
    process.env.MARKETING_GSC_OAUTH_REDIRECT?.trim() ||
    `${publicSiteOrigin()}/api/admin/marketing-seo/gsc/callback`
  );
}

export { newOAuthState };

function gscDb(): any {
  return createAdminClient();
}

async function connectionRow() {
  const { data } = await gscDb()
    .from('marketing_google_connections')
    .select('*')
    .eq('id', 'gsc')
    .maybeSingle();
  return data as {
    encrypted_refresh_token?: string | null;
    google_email?: string | null;
    property_uri?: string | null;
    connected_at?: string | null;
    last_sync_at?: string | null;
    last_error?: string | null;
    extra?: Record<string, unknown>;
  } | null;
}

export async function gscStatus() {
  const row = await connectionRow();
  const refresh = row?.encrypted_refresh_token ? decryptSecret(row.encrypted_refresh_token) : '';
  return {
    connected: Boolean(refresh),
    googleEmail: row?.google_email || null,
    propertyUri: row?.property_uri || null,
    connectedAt: row?.connected_at || null,
    lastSyncAt: row?.last_sync_at || null,
    lastError: row?.last_error || null,
    oauthConfigured: envGoogleClientReady(),
    redirectUri: gscOAuthRedirectUri(),
    scopes: GSC_SCOPES,
  };
}

export async function buildGscAuthUrl(state: string) {
  const client = await createGbpOAuthClient(gscOAuthRedirectUri());
  if (!client) throw new Error('Google OAuth client is not configured. Add GOOGLE_OAUTH_CLIENT_ID and CLIENT_SECRET.');
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: true,
    scope: GSC_SCOPES,
    state,
  });
}

export async function exchangeGscCode(code: string) {
  const client = await createGbpOAuthClient(gscOAuthRedirectUri());
  if (!client) throw new Error('Google OAuth client is not configured.');
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error('Google did not return a refresh token. Remove Techantum access at myaccount.google.com/permissions and connect again.');
  }
  client.setCredentials(tokens);
  let email: string | null = null;
  try {
    email = (await client.getTokenInfo(tokens.access_token || '')).email || null;
  } catch {
    email = null;
  }
  const supabase = gscDb();
  await supabase.from('marketing_google_connections').upsert({
    id: 'gsc',
    encrypted_refresh_token: encryptSecret(tokens.refresh_token),
    google_email: email,
    connected_at: new Date().toISOString(),
    last_error: null,
  });
  return { email };
}

async function gscAccessToken() {
  const row = await connectionRow();
  const refresh = row?.encrypted_refresh_token ? decryptSecret(row.encrypted_refresh_token) : '';
  if (!refresh) throw new Error('Search Console is not connected.');
  const client = await createGbpOAuthClient(gscOAuthRedirectUri());
  if (!client) throw new Error('Google OAuth client is not configured.');
  client.setCredentials({ refresh_token: refresh });
  const token = await client.getAccessToken();
  if (!token.token) throw new Error('Could not refresh the Search Console access token.');
  return { token: token.token, propertyUri: row?.property_uri || '' };
}

async function gscFetch(path: string, init?: RequestInit) {
  const { token } = await gscAccessToken();
  const response = await fetch(`https://www.googleapis.com/webmasters/v3${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    signal: AbortSignal.timeout(20000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body.error?.message || `Search Console API HTTP ${response.status}`;
    await gscDb().from('marketing_google_connections').update({ last_error: message }).eq('id', 'gsc');
    throw new Error(message);
  }
  return body;
}

export async function listGscSites() {
  const body = await gscFetch('/sites');
  return Array.isArray(body.siteEntry) ? body.siteEntry : [];
}

export async function saveGscProperty(propertyUri: string) {
  await gscDb()
    .from('marketing_google_connections')
    .update({ property_uri: propertyUri, last_error: null })
    .eq('id', 'gsc');
}

export async function syncGscAnalytics() {
  const { propertyUri } = await gscAccessToken();
  if (!propertyUri) throw new Error('Select a Search Console property first.');
  const encoded = encodeURIComponent(propertyUri);
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 28);
  const range = {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
  const [summary, queries, pages, sitemaps] = await Promise.all([
    gscFetch(`/sites/${encoded}/searchAnalytics/query`, {
      method: 'POST',
      body: JSON.stringify({ ...range, dimensions: [] }),
    }),
    gscFetch(`/sites/${encoded}/searchAnalytics/query`, {
      method: 'POST',
      body: JSON.stringify({ ...range, dimensions: ['query'], rowLimit: 25 }),
    }),
    gscFetch(`/sites/${encoded}/searchAnalytics/query`, {
      method: 'POST',
      body: JSON.stringify({ ...range, dimensions: ['page'], rowLimit: 25 }),
    }),
    gscFetch(`/sites/${encoded}/sitemaps`),
  ]);
  const totals = Array.isArray(summary.rows) ? summary.rows[0] || {} : {};
  const snapshot = {
    range_start: range.startDate,
    range_end: range.endDate,
    clicks: totals.clicks ?? null,
    impressions: totals.impressions ?? null,
    ctr: totals.ctr ?? null,
    position: totals.position ?? null,
    queries: queries.rows || [],
    pages: pages.rows || [],
    sitemaps: sitemaps.sitemap || [],
    fetched_at: new Date().toISOString(),
  };
  await gscDb().from('marketing_gsc_snapshots').insert(snapshot);
  await gscDb()
    .from('marketing_google_connections')
    .update({ last_sync_at: snapshot.fetched_at, last_error: null })
    .eq('id', 'gsc');
  return snapshot;
}

export async function latestGscSnapshot() {
  const { data } = await gscDb()
    .from('marketing_gsc_snapshots')
    .select('*')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function inspectGscUrl(inspectionUrl: string) {
  const { token, propertyUri } = await gscAccessToken();
  if (!propertyUri) throw new Error('Select a Search Console property first.');
  const response = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inspectionUrl, siteUrl: propertyUri }),
    signal: AbortSignal.timeout(20000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error?.message || 'URL Inspection failed.');
  return body;
}

export function adsIntegrationStatus() {
  const cloudProject = Boolean(process.env.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_ADS_DEVELOPER_TOKEN || process.env.GOOGLE_ADS_CUSTOMER_ID);
  return {
    connected: false,
    ready: false,
    cloudProjectHint: cloudProject,
    message:
      'Live Google Ads API publishing is not enabled. Google Ads API access is managed through a Google Cloud project. Keep using the local Ads Library and Campaign Drafts until API access is approved. Do not use a legacy developer-token onboarding flow.',
  };
}
