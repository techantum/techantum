-- AI Gateway: encrypted provider credentials, routing, and fallback event log.
-- Encrypted API keys are never readable by anon/authenticated clients.
-- Decryption happens only on the server with AI_SECRETS_ENCRYPTION_KEY.

CREATE TABLE IF NOT EXISTS public.ai_gateway_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  primary_provider TEXT NOT NULL DEFAULT 'openai'
    CHECK (primary_provider IN ('openai', 'gemini', 'claude')),
  fallback_provider TEXT NOT NULL DEFAULT 'gemini'
    CHECK (fallback_provider IN ('openai', 'gemini', 'claude')),
  second_fallback_provider TEXT
    CHECK (second_fallback_provider IS NULL OR second_fallback_provider IN ('openai', 'gemini', 'claude')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID
);

INSERT INTO public.ai_gateway_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.ai_provider_credentials (
  provider TEXT PRIMARY KEY CHECK (provider IN ('openai', 'gemini', 'claude')),
  encrypted_api_key TEXT,
  key_hint TEXT,
  model TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID
);

INSERT INTO public.ai_provider_credentials (provider, model, enabled)
VALUES
  ('openai', 'gpt-4o-mini', TRUE),
  ('gemini', 'gemini-2.0-flash', TRUE),
  ('claude', 'claude-3-5-haiku-latest', FALSE)
ON CONFLICT (provider) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.ai_provider_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  purpose TEXT,
  primary_provider TEXT,
  fallback_provider TEXT,
  used_provider TEXT,
  used_model TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'fallback_success', 'failed', 'all_failed')),
  reason TEXT,
  attempts JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS ai_provider_events_created_at_idx
  ON public.ai_provider_events (created_at DESC);

ALTER TABLE public.ai_gateway_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_provider_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_provider_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ai_gateway_settings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.ai_provider_credentials FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.ai_provider_events FROM PUBLIC, anon, authenticated;

GRANT ALL ON public.ai_gateway_settings TO service_role;
GRANT ALL ON public.ai_provider_credentials TO service_role;
GRANT ALL ON public.ai_provider_events TO service_role;

DROP TRIGGER IF EXISTS ai_gateway_settings_updated_at ON public.ai_gateway_settings;
CREATE TRIGGER ai_gateway_settings_updated_at
  BEFORE UPDATE ON public.ai_gateway_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS ai_provider_credentials_updated_at ON public.ai_provider_credentials;
CREATE TRIGGER ai_provider_credentials_updated_at
  BEFORE UPDATE ON public.ai_provider_credentials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

NOTIFY pgrst, 'reload schema';
