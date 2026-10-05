-- Extra business-profile fields collected during website WhatsApp onboarding.

ALTER TABLE public.wa_clients
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS business_category TEXT,
  ADD COLUMN IF NOT EXISTS business_type TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;
