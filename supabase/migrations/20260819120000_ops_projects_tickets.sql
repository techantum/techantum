-- Operations: client onboarding, delivery projects, tickets, estimates, WhatsApp audit.
-- Separate from public.projects (requirement-collection share links).

CREATE TABLE IF NOT EXISTS public.ops_code_sequences (
  kind TEXT NOT NULL,
  year INTEGER NOT NULL DEFAULT 0,
  last_value INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (kind, year)
);

CREATE OR REPLACE FUNCTION public.ops_next_code(p_kind TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  y INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  n INTEGER;
BEGIN
  IF p_kind = 'client' THEN
    INSERT INTO public.ops_code_sequences (kind, year, last_value)
    VALUES ('client', 0, 1)
    ON CONFLICT (kind, year) DO UPDATE SET last_value = public.ops_code_sequences.last_value + 1
    RETURNING last_value INTO n;
    RETURN 'CLI-' || lpad(n::text, 4, '0');
  ELSIF p_kind = 'project' THEN
    INSERT INTO public.ops_code_sequences (kind, year, last_value)
    VALUES ('project', y, 1)
    ON CONFLICT (kind, year) DO UPDATE SET last_value = public.ops_code_sequences.last_value + 1
    RETURNING last_value INTO n;
    RETURN 'PRJ-' || y::text || '-' || lpad(n::text, 4, '0');
  ELSIF p_kind = 'ticket' THEN
    INSERT INTO public.ops_code_sequences (kind, year, last_value)
    VALUES ('ticket', y, 1)
    ON CONFLICT (kind, year) DO UPDATE SET last_value = public.ops_code_sequences.last_value + 1
    RETURNING last_value INTO n;
    RETURN 'TKT-' || y::text || '-' || lpad(n::text, 4, '0');
  ELSE
    RAISE EXCEPTION 'Unknown ops code kind: %', p_kind;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.ops_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  location TEXT,
  contact_number TEXT,
  whatsapp_number TEXT,
  email TEXT,
  website_domain TEXT,
  hosting_provider TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.ops_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES public.ops_clients(id) ON DELETE RESTRICT,
  project_name TEXT NOT NULL,
  project_type TEXT NOT NULL,
  package_name TEXT NOT NULL,
  website_domain TEXT,
  hosting_provider TEXT,
  scope_document_url TEXT,
  scope_url TEXT,
  estimated_hours NUMERIC(10,2) NOT NULL CHECK (estimated_hours > 0),
  cost_per_hour NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost_per_hour >= 0),
  developers_count INTEGER NOT NULL DEFAULT 1 CHECK (developers_count >= 1),
  start_date DATE NOT NULL,
  original_end_date DATE NOT NULL,
  current_end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'onboarding',
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.ops_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES public.ops_clients(id) ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES public.ops_projects(id) ON DELETE CASCADE,
  ticket_type TEXT NOT NULL CHECK (ticket_type IN ('FEATURE', 'ENHANCEMENT', 'BUG')),
  title TEXT NOT NULL,
  description TEXT,
  scope_document_url TEXT,
  scope_url TEXT,
  estimated_hours NUMERIC(10,2) NOT NULL CHECK (estimated_hours > 0),
  cost_per_hour NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost_per_hour >= 0),
  developers_count INTEGER NOT NULL DEFAULT 1 CHECK (developers_count >= 1),
  start_date DATE NOT NULL,
  original_end_date DATE NOT NULL,
  current_end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.ops_project_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.ops_projects(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  note TEXT,
  changed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.ops_ticket_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.ops_tickets(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  note TEXT,
  changed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.ops_project_date_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.ops_projects(id) ON DELETE CASCADE,
  previous_end_date DATE NOT NULL,
  new_end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  extended_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.ops_ticket_date_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.ops_tickets(id) ON DELETE CASCADE,
  previous_end_date DATE NOT NULL,
  new_end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  extended_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.ops_client_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.ops_clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.ops_projects(id) ON DELETE SET NULL,
  ticket_id UUID REFERENCES public.ops_tickets(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  message_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  message_body TEXT NOT NULL,
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_by UUID,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ops_clients_name ON public.ops_clients (lower(name));
CREATE INDEX IF NOT EXISTS idx_ops_clients_email ON public.ops_clients (lower(email));
CREATE INDEX IF NOT EXISTS idx_ops_projects_client ON public.ops_projects (client_id);
CREATE INDEX IF NOT EXISTS idx_ops_projects_status ON public.ops_projects (status);
CREATE INDEX IF NOT EXISTS idx_ops_projects_end ON public.ops_projects (current_end_date);
CREATE INDEX IF NOT EXISTS idx_ops_tickets_project ON public.ops_tickets (project_id);
CREATE INDEX IF NOT EXISTS idx_ops_tickets_client ON public.ops_tickets (client_id);
CREATE INDEX IF NOT EXISTS idx_ops_tickets_status ON public.ops_tickets (status);
CREATE INDEX IF NOT EXISTS idx_ops_tickets_type ON public.ops_tickets (ticket_type);
CREATE INDEX IF NOT EXISTS idx_ops_comms_client ON public.ops_client_communications (client_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_ops_clients_updated ON public.ops_clients;
CREATE TRIGGER trg_ops_clients_updated BEFORE UPDATE ON public.ops_clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_ops_projects_updated ON public.ops_projects;
CREATE TRIGGER trg_ops_projects_updated BEFORE UPDATE ON public.ops_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_ops_tickets_updated ON public.ops_tickets;
CREATE TRIGGER trg_ops_tickets_updated BEFORE UPDATE ON public.ops_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.ops_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_project_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_ticket_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_project_date_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_ticket_date_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_client_communications ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'ops_clients',
    'ops_projects',
    'ops_tickets',
    'ops_project_status_history',
    'ops_ticket_status_history',
    'ops_project_date_extensions',
    'ops_ticket_date_extensions',
    'ops_client_communications'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_admin ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I_admin ON public.%I FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))',
      tbl, tbl
    );
  END LOOP;
END $$;
