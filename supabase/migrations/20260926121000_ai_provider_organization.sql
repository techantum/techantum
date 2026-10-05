-- Optional organization / project ID for enterprise AI provider accounts.

ALTER TABLE public.ai_provider_credentials
  ADD COLUMN IF NOT EXISTS organization_id TEXT;
