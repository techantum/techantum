-- Operational links for Project Management.
-- Projects, employees and clients stay the masters. These tables only store references.

ALTER TABLE public.project_management_projects
  ADD COLUMN IF NOT EXISTS actual_start_date DATE;

ALTER TABLE public.project_management_onboarding
  ADD COLUMN IF NOT EXISTS environment_ready TEXT NOT NULL DEFAULT 'not_filled',
  ADD COLUMN IF NOT EXISTS repository_created TEXT NOT NULL DEFAULT 'not_filled',
  ADD COLUMN IF NOT EXISTS communication_channel TEXT NOT NULL DEFAULT 'not_filled',
  ADD COLUMN IF NOT EXISTS kickoff_completed TEXT NOT NULL DEFAULT 'not_filled';

ALTER TABLE public.project_management_audit_logs
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.project_management_projects(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.project_management_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO public.project_management_roles (name, sort_order)
SELECT * FROM (VALUES
  ('Project Lead', 1),
  ('Technical Lead', 2),
  ('Backend Developer', 3),
  ('Frontend Developer', 4),
  ('Full Stack Developer', 5),
  ('Mobile Developer', 6),
  ('UI/UX Designer', 7),
  ('QA Engineer', 8),
  ('DevOps', 9),
  ('Business Analyst', 10),
  ('Account Manager', 11),
  ('Support Engineer', 12),
  ('Other', 13)
) AS v(name, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.project_management_roles r WHERE r.name = v.name);

CREATE TABLE IF NOT EXISTS public.project_management_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.project_management_projects(id),
  employee_id UUID NOT NULL REFERENCES public.finance_employees(id),
  role_id UUID REFERENCES public.project_management_roles(id),
  allocation_percent NUMERIC(5,2) NOT NULL DEFAULT 100,
  start_date DATE,
  end_date DATE,
  responsibility TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pm_allocation_status_chk CHECK (status IN ('active', 'released')),
  CONSTRAINT pm_allocation_percent_chk CHECK (allocation_percent >= 0 AND allocation_percent <= 200)
);

CREATE UNIQUE INDEX IF NOT EXISTS pm_allocation_active_unique
  ON public.project_management_allocations (project_id, employee_id)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.project_management_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_code TEXT NOT NULL UNIQUE,
  project_id UUID NOT NULL REFERENCES public.project_management_projects(id),
  parent_id UUID REFERENCES public.project_management_requirements(id),
  category TEXT NOT NULL DEFAULT 'functional',
  module_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  objective TEXT,
  source TEXT NOT NULL DEFAULT 'client',
  priority TEXT NOT NULL DEFAULT 'must_have',
  status TEXT NOT NULL DEFAULT 'draft',
  requested_by_employee_id UUID REFERENCES public.finance_employees(id),
  owner_employee_id UUID REFERENCES public.finance_employees(id),
  phase_id UUID REFERENCES public.project_management_phases(id),
  target_date DATE,
  acceptance_criteria TEXT,
  dependency TEXT,
  client_approval_required BOOLEAN NOT NULL DEFAULT FALSE,
  client_approval_status TEXT NOT NULL DEFAULT 'not_required',
  approved_by_employee_id UUID REFERENCES public.finance_employees(id),
  approval_date DATE,
  remarks TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pm_requirement_category_chk CHECK (category IN ('business','functional','non_functional','technical','integration','ui_ux','security','change')),
  CONSTRAINT pm_requirement_source_chk CHECK (source IN ('client','account_manager','project_team','management','support','internal')),
  CONSTRAINT pm_requirement_priority_chk CHECK (priority IN ('must_have','should_have','could_have','future')),
  CONSTRAINT pm_requirement_status_chk CHECK (status IN ('draft','under_review','approved','in_development','implemented','tested','accepted','rejected','deferred')),
  CONSTRAINT pm_requirement_approval_chk CHECK (client_approval_status IN ('not_required','pending','approved','rejected'))
);

ALTER TABLE public.project_management_tickets
  ADD COLUMN IF NOT EXISTS requirement_id UUID REFERENCES public.project_management_requirements(id),
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS severity TEXT,
  ADD COLUMN IF NOT EXISTS assigned_employee_id UUID REFERENCES public.finance_employees(id),
  ADD COLUMN IF NOT EXISTS raised_by_employee_id UUID REFERENCES public.finance_employees(id),
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS resolution TEXT,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

ALTER TABLE public.project_management_tickets DROP CONSTRAINT IF EXISTS pm_ticket_type_chk;
ALTER TABLE public.project_management_tickets
  ADD CONSTRAINT pm_ticket_type_chk CHECK (ticket_type IN (
    'FEATURE','ENHANCEMENT','BUG',
    'bug','change_request','support','improvement','task','issue','client_request'
  ));

ALTER TABLE public.project_management_tickets DROP CONSTRAINT IF EXISTS pm_ticket_status_chk;
ALTER TABLE public.project_management_tickets
  ADD CONSTRAINT pm_ticket_status_chk CHECK (status IN (
    'open','in_progress','client_review','completed','cancelled',
    'assigned','waiting_for_client','blocked','testing','resolved','closed','reopened'
  ));

ALTER TABLE public.project_management_tickets DROP CONSTRAINT IF EXISTS pm_ticket_priority_chk;
ALTER TABLE public.project_management_tickets
  ADD CONSTRAINT pm_ticket_priority_chk CHECK (priority IN ('critical','high','medium','low'));

CREATE TABLE IF NOT EXISTS public.project_management_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL,
  project_id UUID REFERENCES public.project_management_projects(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  employee_id UUID REFERENCES public.finance_employees(id) ON DELETE SET NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_allocations_project ON public.project_management_allocations (project_id);
CREATE INDEX IF NOT EXISTS idx_pm_allocations_employee ON public.project_management_allocations (employee_id);
CREATE INDEX IF NOT EXISTS idx_pm_allocations_status ON public.project_management_allocations (status);
CREATE INDEX IF NOT EXISTS idx_pm_requirements_project ON public.project_management_requirements (project_id);
CREATE INDEX IF NOT EXISTS idx_pm_requirements_status ON public.project_management_requirements (status);
CREATE INDEX IF NOT EXISTS idx_pm_tickets_project ON public.project_management_tickets (project_id);
CREATE INDEX IF NOT EXISTS idx_pm_tickets_status ON public.project_management_tickets (status);
CREATE INDEX IF NOT EXISTS idx_pm_tickets_assignee ON public.project_management_tickets (assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_pm_tickets_due ON public.project_management_tickets (due_date);
CREATE INDEX IF NOT EXISTS idx_pm_daily_date ON public.project_management_daily_updates (update_date);
CREATE INDEX IF NOT EXISTS idx_pm_events_project ON public.project_management_events (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pm_audit_project ON public.project_management_audit_logs (project_id, created_at DESC);

ALTER TABLE public.project_management_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_management_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_management_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_management_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_management_roles_admin ON public.project_management_roles;
CREATE POLICY project_management_roles_admin ON public.project_management_roles
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS project_management_allocations_admin ON public.project_management_allocations;
CREATE POLICY project_management_allocations_admin ON public.project_management_allocations
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS project_management_requirements_admin ON public.project_management_requirements;
CREATE POLICY project_management_requirements_admin ON public.project_management_requirements
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS project_management_events_admin ON public.project_management_events;
CREATE POLICY project_management_events_admin ON public.project_management_events
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
