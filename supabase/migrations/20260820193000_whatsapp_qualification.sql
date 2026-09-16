ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS qualification JSONB NOT NULL DEFAULT '{}'::jsonb;
