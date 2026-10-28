ALTER TABLE public.saas_packages
  ADD COLUMN IF NOT EXISTS razorpay_plan_id TEXT;

ALTER TABLE public.saas_accounts
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS pending_package_id UUID REFERENCES public.saas_packages(id);

CREATE TABLE IF NOT EXISTS public.hookooh_login_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hookooh_login_otps_phone_idx ON public.hookooh_login_otps (phone, created_at DESC);
