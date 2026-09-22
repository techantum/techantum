-- Login OTPs sent over WhatsApp (hashed, short-lived) plus phone identity map.

CREATE TABLE IF NOT EXISTS public.wa_login_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS wa_login_otps_phone_idx ON public.wa_login_otps(phone, created_at DESC);

CREATE TABLE IF NOT EXISTS public.wa_login_identities (
  phone TEXT PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.wa_login_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_login_identities ENABLE ROW LEVEL SECURITY;
