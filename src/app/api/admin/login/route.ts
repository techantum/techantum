import { NextResponse } from 'next/server';
import {
  LOCAL_ADMIN_COOKIE,
  createLocalAdminCookie,
  localAdminCookieOptions,
} from '@/lib/auth/local-admin-session';
import { query } from '@/lib/db/postgres';
import type { AdminRole } from '@/lib/admin/roles';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() || '';
  const password = body.password || '';
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  try {
    const { rows } = await query<{ id: string; email: string; role: string | null }>(
      `SELECT u.id, u.email, a.role
       FROM auth.users u
       JOIN public.admin_users a ON a.user_id = u.id
       WHERE lower(u.email) = $1
         AND u.deleted_at IS NULL
         AND u.encrypted_password = extensions.crypt($2, u.encrypted_password)
       LIMIT 1`,
      [email, password]
    );
    const admin = rows[0];
    if (!admin) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const role = (admin.role || 'ADMIN') as AdminRole;
    const response = NextResponse.json({ ok: true, role });
    response.cookies.set(
      LOCAL_ADMIN_COOKIE,
      createLocalAdminCookie({ userId: admin.id, email: admin.email, role }),
      localAdminCookieOptions()
    );
    return response;
  } catch (err) {
    console.error('[admin login]', err);
    return NextResponse.json({ error: 'Sign-in is temporarily unavailable' }, { status: 503 });
  }
}
