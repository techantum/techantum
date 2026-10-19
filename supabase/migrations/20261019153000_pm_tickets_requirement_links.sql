-- Tickets and requirement links belong to Project Management projects.
-- WhatsApp history can point at these records without reusing ops project IDs.

CREATE TABLE IF NOT EXISTS public.project_management_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code TEXT NOT NULL UNIQUE,
  project_id UUID NOT NULL REFERENCES public.project_management_projects(id),
  ticket_type TEXT NOT NULL DEFAULT 'FEATURE',
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  start_date DATE,
  end_date DATE,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pm_ticket_type_chk CHECK (ticket_type IN ('FEATURE','ENHANCEMENT','BUG')),
  CONSTRAINT pm_ticket_status_chk CHECK (status IN ('open','in_progress','client_review','completed','cancelled'))
);

CREATE TABLE IF NOT EXISTS public.project_management_requirement_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  client_name TEXT,
  company_name TEXT,
  email TEXT,
  whatsapp_number TEXT,
  project_name TEXT,
  project_type TEXT,
  brief TEXT,
  preferred_start DATE,
  references_text TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  submitted_at TIMESTAMPTZ,
  pm_project_id UUID REFERENCES public.project_management_projects(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pm_requirement_status_chk CHECK (status IN ('open','submitted','used'))
);

ALTER TABLE public.ops_client_communications
  ADD COLUMN IF NOT EXISTS pm_project_id UUID REFERENCES public.project_management_projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pm_ticket_id UUID REFERENCES public.project_management_tickets(id) ON DELETE SET NULL;

ALTER TABLE public.project_management_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_management_requirement_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_management_tickets_admin ON public.project_management_tickets;
CREATE POLICY project_management_tickets_admin ON public.project_management_tickets
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS project_management_requirement_links_admin ON public.project_management_requirement_links;
CREATE POLICY project_management_requirement_links_admin ON public.project_management_requirement_links
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
