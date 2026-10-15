import { randomUUID } from 'crypto';
import { getPool, query } from '@/lib/db/postgres';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type DeveloperAdmin = {
  user_id: string;
  email: string;
  role: string;
  created_at: string;
};

export async function listDeveloperAdmins() {
  const { rows } = await query<DeveloperAdmin>(
    `SELECT user_id, email, role, created_at
     FROM public.admin_users
     WHERE role = 'ADMIN'
     ORDER BY created_at DESC`
  );
  return rows;
}

export async function createDeveloperAdmin(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_RE.test(normalized)) {
    throw Object.assign(new Error('Enter a valid email address.'), { status: 400 });
  }
  if (password.length < 8) {
    throw Object.assign(new Error('Password must be at least 8 characters.'), { status: 400 });
  }

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query<{ id: string; role: string | null }>(
      `SELECT u.id, a.role
       FROM auth.users u
       LEFT JOIN public.admin_users a ON a.user_id = u.id
       WHERE lower(u.email) = $1
         AND u.deleted_at IS NULL
       LIMIT 1`,
      [normalized]
    );
    const found = existing.rows[0];
    if (found?.role === 'SUPER_ADMIN') {
      throw Object.assign(new Error('That email belongs to the super admin.'), { status: 400 });
    }
    if (found?.role === 'ADMIN') {
      throw Object.assign(new Error('A developer admin with this email already exists.'), { status: 409 });
    }

    const userId = found?.id || randomUUID();
    if (!found) {
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
           '{"role":"developer_admin"}'::jsonb,
           now(), now(), false, false
         )`,
        [userId, normalized, password]
      );
      await client.query(
        `INSERT INTO auth.identities (user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
         SELECT id, id::text, 'email',
           jsonb_build_object('sub', id::text, 'email', $2::text, 'email_verified', true, 'phone_verified', false),
           now(), now(), now()
         FROM (SELECT $1::uuid AS id) AS account`,
        [userId, normalized]
      );
    } else {
      await client.query(
        `UPDATE auth.users
         SET encrypted_password = extensions.crypt($2, extensions.gen_salt('bf')),
             email_confirmed_at = COALESCE(email_confirmed_at, now()),
             updated_at = now()
         WHERE id = $1`,
        [userId, password]
      );
    }

    await client.query(
      `INSERT INTO public.admin_users (user_id, email, role)
       VALUES ($1, $2, 'ADMIN')
       ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email, role = 'ADMIN'`,
      [userId, normalized]
    );
    await client.query('COMMIT');
    return { userId, email: normalized };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function removeDeveloperAdmin(userId: string) {
  const { rows } = await query<{ role: string }>(
    `SELECT role FROM public.admin_users WHERE user_id = $1`,
    [userId]
  );
  if (!rows[0] || rows[0].role !== 'ADMIN') {
    throw Object.assign(new Error('Developer admin not found.'), { status: 404 });
  }

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM public.admin_users WHERE user_id = $1 AND role = 'ADMIN'`, [userId]);
    await client.query(`DELETE FROM auth.refresh_tokens WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM auth.sessions WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM auth.identities WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM auth.users WHERE id = $1`, [userId]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function changeSuperAdminPassword(userId: string, currentPassword: string, nextPassword: string) {
  if (nextPassword.length < 8) {
    throw Object.assign(new Error('New password must be at least 8 characters.'), { status: 400 });
  }
  if (nextPassword === currentPassword) {
    throw Object.assign(new Error('Choose a password that is different from the current one.'), { status: 400 });
  }

  const { rowCount } = await query(
    `UPDATE auth.users
     SET encrypted_password = extensions.crypt($2, extensions.gen_salt('bf')),
         updated_at = now()
     WHERE id = $1
       AND deleted_at IS NULL
       AND encrypted_password = extensions.crypt($3, encrypted_password)
       AND EXISTS (
         SELECT 1 FROM public.admin_users a
         WHERE a.user_id = auth.users.id AND a.role = 'SUPER_ADMIN'
       )`,
    [userId, nextPassword, currentPassword]
  );
  if (!rowCount) {
    throw Object.assign(new Error('Current password is incorrect.'), { status: 400 });
  }
}
