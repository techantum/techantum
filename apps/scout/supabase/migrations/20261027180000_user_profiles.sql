CREATE TABLE IF NOT EXISTS public.saas_profiles (
  user_id UUID PRIMARY KEY,
  name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
