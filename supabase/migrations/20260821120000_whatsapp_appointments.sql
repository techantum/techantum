-- WhatsApp call appointments CRM

CREATE SEQUENCE IF NOT EXISTS whatsapp_appointment_code_seq START 1;

CREATE OR REPLACE FUNCTION public.whatsapp_next_appointment_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  y INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  n INTEGER;
BEGIN
  n := nextval('whatsapp_appointment_code_seq');
  RETURN 'APT-' || y::TEXT || '-' || lpad(n::TEXT, 4, '0');
END;
$$;

CREATE TABLE IF NOT EXISTS public.whatsapp_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  contact_id UUID NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  contact_name TEXT,
  service TEXT,
  requirement TEXT,
  requested_slot_text TEXT,
  scheduled_at TIMESTAMPTZ,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  status TEXT NOT NULL DEFAULT 'SCHEDULED'
    CHECK (status IN ('SCHEDULED', 'CONFIRMED', 'IN_DISCUSSION', 'COMPLETED', 'FOLLOW_UP', 'NO_SHOW', 'CANCELLED')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS whatsapp_appointments_status_idx
  ON public.whatsapp_appointments (status, scheduled_at);
CREATE INDEX IF NOT EXISTS whatsapp_appointments_conversation_idx
  ON public.whatsapp_appointments (conversation_id);
CREATE INDEX IF NOT EXISTS whatsapp_appointments_contact_idx
  ON public.whatsapp_appointments (contact_id);

CREATE TABLE IF NOT EXISTS public.whatsapp_appointment_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.whatsapp_appointments(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'NOTE' CHECK (kind IN ('STATUS', 'NOTE', 'BOOKED')),
  status TEXT,
  body TEXT,
  client_message TEXT,
  sent_to_client BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  send_error TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS whatsapp_appointment_updates_appt_idx
  ON public.whatsapp_appointment_updates (appointment_id, created_at DESC);

ALTER TABLE public.whatsapp_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_appointment_updates ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['whatsapp_appointments', 'whatsapp_appointment_updates']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_admin ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_admin ON public.%I FOR ALL USING (
        EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid())
      ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid())
      )',
      t, t
    );
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS whatsapp_appointments_updated_at ON public.whatsapp_appointments;
CREATE TRIGGER whatsapp_appointments_updated_at
  BEFORE UPDATE ON public.whatsapp_appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
