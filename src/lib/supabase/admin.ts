import { createClient } from '@supabase/supabase-js';
import { getLocalRestUrl, getAuthSupabaseUrl, isAuthUserId, mintServiceRoleJwt } from '@/lib/supabase/local-jwt';

export { isAuthUserId };

export { getAuthSupabaseUrl };

function getSupabaseUrl() {
  return getLocalRestUrl() || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
}

function getSecretKey() {
  if (getLocalRestUrl() && process.env.POSTGREST_JWT_SECRET?.trim()) {
    return mintServiceRoleJwt();
  }
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
}

export function getAuthSecretKey() {
  return (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
}

export function createAdminClient() {
  return createClient(getSupabaseUrl(), getSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createAuthAdminClient() {
  const url = getAuthSupabaseUrl();
  const key = getAuthSecretKey();
  if (!url || !key) {
    throw new Error('Supabase Auth is not configured.');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function setAuthUserPassword(email: string, password: string, userId?: string | null) {
  const auth = createAuthAdminClient();
  const normalizedEmail = email.trim().toLowerCase();
  let id = isAuthUserId(userId) ? userId : '';

  if (id) {
    const existing = await auth.auth.admin.getUserById(id);
    if (!existing.data.user) id = '';
  }

  if (!id) {
    const found = await auth.auth.admin.generateLink({ type: 'magiclink', email: normalizedEmail });
    id = found.data.user?.id || '';
  }

  if (id) {
    const { error } = await auth.auth.admin.updateUserById(id, { password, email_confirm: true });
    if (error) throw new Error(error.message);
    return id;
  }

  const created = await auth.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: { role: 'partner' },
  });
  if (!created.data.user) {
    throw new Error(created.error?.message || 'Could not create the login account.');
  }
  return created.data.user.id;
}

export function getPublishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY!
  );
}
