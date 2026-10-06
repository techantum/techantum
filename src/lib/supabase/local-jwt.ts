import { createHmac } from 'crypto';

export function getLocalRestUrl() {
  return (process.env.LOCAL_REST_URL || '').trim();
}

export function getAuthSupabaseUrl() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
}

export function mintServiceRoleJwt() {
  const secret = process.env.POSTGREST_JWT_SECRET?.trim();
  if (!secret) {
    throw new Error('POSTGREST_JWT_SECRET is not set');
  }
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    role: 'service_role',
    iss: 'techantum-local-rest',
    iat: now,
    exp: now + 60 * 60 * 12,
  };
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function b64url(value: string) {
  return Buffer.from(value).toString('base64url');
}
