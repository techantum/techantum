-- Internal staff notes on WhatsApp conversations (CRM chat list)

CREATE TABLE IF NOT EXISTS public.whatsapp_conversation_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS whatsapp_conversation_notes_conv_idx
  ON public.whatsapp_conversation_notes (conversation_id, created_at DESC);

ALTER TABLE public.whatsapp_conversation_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS whatsapp_conversation_notes_admin ON public.whatsapp_conversation_notes;
CREATE POLICY whatsapp_conversation_notes_admin ON public.whatsapp_conversation_notes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid())
);
