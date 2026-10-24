import { createHmac } from 'crypto';

export function getLocalRestUrl() {
  return (process.env.LOCAL_REST_URL || '').trim();
}

export function getAuthSupabaseUrl() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isAuthUserId(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export const SERVICE_ROLE_JWT_SECONDS = 60 * 60 * 12;

export function serviceJwtStillValid(expiresAt: number, now = Math.floor(Date.now() / 1000), skewSeconds = 120) {
  return expiresAt - now > skewSeconds;
}

export function mintServiceRoleJwt(now = Math.floor(Date.now() / 1000)) {
  const secret = process.env.POSTGREST_JWT_SECRET?.trim();
  if (!secret) {
    throw new Error('POSTGREST_JWT_SECRET is not set');
  }
  const payload = {
    role: 'service_role',
    iss: 'techantum-local-rest',
    iat: now,
    exp: now + SERVICE_ROLE_JWT_SECONDS,
  };
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function b64url(value: string) {
  return Buffer.from(value).toString('base64url');
}
