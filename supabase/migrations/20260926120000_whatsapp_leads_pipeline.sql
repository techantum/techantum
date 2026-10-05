-- Unify WhatsApp conversation lead stages into the CRM pipeline used by Leads.

UPDATE public.whatsapp_conversations
SET lead_stage = 'IN_DISCUSSION'
WHERE lead_stage IN ('ENGAGED', 'REQUIREMENT_IDENTIFIED', 'PROPOSAL_REQUESTED', 'HUMAN_FOLLOWUP');

UPDATE public.whatsapp_leads
SET lead_stage = 'IN_DISCUSSION',
    status = CASE
      WHEN status IN ('ENGAGED', 'REQUIREMENT_IDENTIFIED', 'PROPOSAL_REQUESTED', 'HUMAN_FOLLOWUP') THEN 'IN_DISCUSSION'
      ELSE status
    END
WHERE lead_stage IN ('ENGAGED', 'REQUIREMENT_IDENTIFIED', 'PROPOSAL_REQUESTED', 'HUMAN_FOLLOWUP')
   OR status IN ('ENGAGED', 'REQUIREMENT_IDENTIFIED', 'PROPOSAL_REQUESTED', 'HUMAN_FOLLOWUP');

UPDATE public.whatsapp_conversations c
SET lead_stage = 'APPOINTMENT_BOOKED'
WHERE c.lead_stage NOT IN ('CONVERTED', 'LOST')
  AND EXISTS (
    SELECT 1
    FROM public.whatsapp_appointments a
    WHERE a.conversation_id = c.id
      AND a.status NOT IN ('CANCELLED', 'NO_SHOW')
  );

UPDATE public.whatsapp_leads l
SET lead_stage = 'APPOINTMENT_BOOKED',
    status = 'APPOINTMENT_BOOKED'
WHERE l.lead_stage NOT IN ('CONVERTED', 'LOST')
  AND EXISTS (
    SELECT 1
    FROM public.whatsapp_appointments a
    WHERE a.conversation_id = l.conversation_id
      AND a.status NOT IN ('CANCELLED', 'NO_SHOW')
  );

CREATE INDEX IF NOT EXISTS whatsapp_conversations_lead_stage_idx
  ON public.whatsapp_conversations (lead_stage);
