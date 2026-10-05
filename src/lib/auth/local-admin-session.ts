import { createHmac } from 'crypto';
import { cookies } from 'next/headers';
import type { User } from '@supabase/supabase-js';
import type { AdminRole } from '@/lib/admin/roles';

export const LOCAL_ADMIN_COOKIE = 'ta_admin_session';
const SESSION_HOURS = 12;

type SessionPayload = {
  sub: string;
  email: string;
  role: AdminRole;
  exp: number;
};

function sessionSecret() {
  return (
    process.env.LOCAL_SESSION_SECRET?.trim() ||
    process.env.POSTGREST_JWT_SECRET?.trim() ||
    process.env.AI_SECRETS_ENCRYPTION_KEY?.trim() ||
    ''
  );
}

function sign(value: string) {
  const secret = sessionSecret();
  if (!secret) throw new Error('LOCAL_SESSION_SECRET is not set');
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function createLocalAdminCookie(input: { userId: string; email: string; role: AdminRole }) {
  const payload: SessionPayload = {
    sub: input.userId,
    email: input.email,
    role: input.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_HOURS * 60 * 60,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function readLocalAdminSession(token: string | undefined | null): SessionPayload | null {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  try {
    if (sign(body) !== sig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload.sub || !payload.email || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function localAdminCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_HOURS * 60 * 60,
  };
}

export async function getLocalAdminUser(): Promise<{ user: User; role: AdminRole; email: string } | null> {
  const jar = await cookies();
  const session = readLocalAdminSession(jar.get(LOCAL_ADMIN_COOKIE)?.value);
  if (!session) return null;
  return {
    role: session.role,
    email: session.email,
    user: {
      id: session.sub,
      email: session.email,
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as User,
  };
}
