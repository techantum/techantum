ALTER TABLE public.youtube_module_settings
  ADD COLUMN IF NOT EXISTS meta_app_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_app_secret_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS meta_ads_token_ciphertext TEXT;
