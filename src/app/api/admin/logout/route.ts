import { NextResponse } from 'next/server';
import { LOCAL_ADMIN_COOKIE, localAdminCookieOptions } from '@/lib/auth/local-admin-session';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(LOCAL_ADMIN_COOKIE, '', { ...localAdminCookieOptions(), maxAge: 0 });
  return response;
}
