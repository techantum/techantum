import { createClient } from '@supabase/supabase-js';
import { getLocalRestUrl, getAuthSupabaseUrl, mintServiceRoleJwt } from '@/lib/supabase/local-jwt';

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

export function getPublishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY!
  );
}
