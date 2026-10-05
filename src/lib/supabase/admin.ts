import { createClient } from '@supabase/supabase-js';
import { getLocalRestUrl, mintServiceRoleJwt } from '@/lib/supabase/local-jwt';

function getSupabaseUrl() {
  return getLocalRestUrl() || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
}

function getSecretKey() {
  if (getLocalRestUrl() && process.env.POSTGREST_JWT_SECRET?.trim()) {
    return mintServiceRoleJwt();
  }
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
}

export function createAdminClient() {
  return createClient(getSupabaseUrl(), getSecretKey(), {
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
