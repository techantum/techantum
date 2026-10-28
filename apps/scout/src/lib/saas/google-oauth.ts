import { publicAppUrl } from '@/lib/brand';
import { decryptSecret } from '@/lib/ai/crypto';
import { q } from '@/lib/finance/db';

function envClientId() {
  return (
    process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() ||
    process.env.GBP_OAUTH_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ||
    ''
  );
}

function envClientSecret() {
  return process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() || process.env.GBP_OAUTH_CLIENT_SECRET?.trim() || '';
}

export async function googleCredentials() {
  let clientId = envClientId();
  let clientSecret = envClientSecret();
  if (clientId && clientSecret) return { clientId, clientSecret };
  try {
    const { rows } = await q<{ client_id: string | null; encrypted_client_secret: string | null }>(
      undefined,
      `SELECT client_id, encrypted_client_secret FROM gbp_oauth_connections WHERE id = 1 LIMIT 1`,
    );
    const row = rows[0];
    if (!clientId && row?.client_id?.trim()) clientId = row.client_id.trim();
    if (!clientSecret && row?.encrypted_client_secret) {
      try {
        clientSecret = decryptSecret(row.encrypted_client_secret).trim();
      } catch {
        clientSecret = '';
      }
    }
  } catch {
    /* GBP table is optional on a Hookooh-only database */
  }
  return { clientId, clientSecret };
}

export async function googleOAuthConfigured() {
  const { clientId, clientSecret } = await googleCredentials();
  return Boolean(clientId && clientSecret);
}

export function googleRedirectUri() {
  return `${publicAppUrl().replace(/\/$/, '')}/api/auth/google/callback`;
}

export function googleAuthUrl(state: string, clientId: string) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
    access_type: 'online',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function googleProfileFromCode(code: string, redirectUri = googleRedirectUri()) {
  const { clientId, clientSecret } = await googleCredentials();
  if (!clientId || !clientSecret) throw new Error('Google sign-in is not configured.');
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  const token = await tokenRes.json();
  if (!token.access_token) throw new Error(token.error_description || 'Google sign-in failed.');
  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const profile = await profileRes.json();
  const email = String(profile.email || '').trim().toLowerCase();
  if (!email) throw new Error('Google did not share an email address.');
  return {
    email,
    name: String(profile.name || email.split('@')[0]),
    sub: String(profile.sub || ''),
  };
}
