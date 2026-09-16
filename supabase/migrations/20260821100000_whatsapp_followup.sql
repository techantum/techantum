ALTER TABLE public.ai_settings
  ADD COLUMN IF NOT EXISTS followup_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS followup_first_hours INTEGER NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS followup_second_hours INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS followup_max INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS followup_start_hour INTEGER NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS followup_end_hour INTEGER NOT NULL DEFAULT 20;

ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS followup_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_followup_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS whatsapp_conversations_followup_idx
  ON public.whatsapp_conversations (status, last_outbound_at)
  WHERE status = 'OPEN';
