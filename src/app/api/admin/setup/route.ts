import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getPool, query } from '@/lib/db/postgres';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function adminCount() {
  const { rows } = await query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM public.admin_users`);
  return Number(rows[0]?.count || 0);
}

export async function POST(request: Request) {
  let email = '';
  let password = '';
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    email = body.email?.trim().toLowerCase() || '';
    password = body.password || '';
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!EMAIL_RE.test(email) || password.length < 8) {
    return NextResponse.json({ error: 'Enter a valid email and a password of at least 8 characters.' }, { status: 400 });
  }

  try {
    if ((await adminCount()) > 0) {
      return NextResponse.json({ error: 'Admin already configured. Sign in with the existing admin account.' }, { status: 403 });
    }
  } catch (err) {
    console.error('[admin setup] count failed', err);
    return NextResponse.json({ error: 'Admin setup is temporarily unavailable.' }, { status: 503 });
  }

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query('LOCK TABLE public.admin_users IN EXCLUSIVE MODE');
    const locked = await client.query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM public.admin_users`);
    if (Number(locked.rows[0]?.count || 0) > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Admin already configured. Sign in with the existing admin account.' }, { status: 403 });
    }

    const userId = randomUUID();
    await client.query(
      `INSERT INTO auth.users (
         instance_id, id, aud, role, email, encrypted_password,
         email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
         created_at, updated_at, is_sso_user, is_anonymous
       ) VALUES (
         '00000000-0000-0000-0000-000000000000',
         $1, 'authenticated', 'authenticated', $2,
         extensions.crypt($3, extensions.gen_salt('bf')),
         now(),
         '{"provider":"email","providers":["email"]}'::jsonb,
         '{"role":"super_admin"}'::jsonb,
         now(), now(), false, false
       )`,
      [userId, email, password]
    );
    await client.query(
      `INSERT INTO auth.identities (user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
       SELECT id, id::text, 'email',
         jsonb_build_object('sub', id::text, 'email', $2::text, 'email_verified', true, 'phone_verified', false),
         now(), now(), now()
       FROM (SELECT $1::uuid AS id) AS account`,
      [userId, email]
    );
    await client.query(
      `INSERT INTO public.admin_users (user_id, email, role) VALUES ($1, $2, 'SUPER_ADMIN')`,
      [userId, email]
    );
    await client.query('COMMIT');
    return NextResponse.json({ success: true, email });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('[admin setup]', err);
    return NextResponse.json({ error: 'Admin setup is temporarily unavailable.' }, { status: 503 });
  } finally {
    client.release();
  }
}
