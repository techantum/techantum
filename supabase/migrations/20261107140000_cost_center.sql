-- Cost Center: internal project estimation, cost planning and profitability reference.
-- Reuses ops_clients, project_management_projects, finance_employees.
-- Does not replace Finance; does not duplicate master data.

CREATE TABLE IF NOT EXISTS public.cost_center_sequences (
  kind TEXT PRIMARY KEY,
  last_value INTEGER NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.cost_center_next_code(p_prefix TEXT, p_pad INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  n INTEGER;
  prefix TEXT := BTRIM(p_prefix);
  pad INTEGER := GREATEST(COALESCE(p_pad, 3), 1);
BEGIN
  INSERT INTO public.cost_center_sequences (kind, last_value)
  VALUES (prefix, 1)
  ON CONFLICT (kind) DO UPDATE SET last_value = public.cost_center_sequences.last_value + 1
  RETURNING last_value INTO n;
  RETURN prefix || lpad(n::text, pad, '0');
END;
$$;

-- Singleton estimation + overhead assumptions
CREATE TABLE IF NOT EXISTS public.cost_center_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  screen_hours NUMERIC(10,2) NOT NULL DEFAULT 8,
  api_hours NUMERIC(10,2) NOT NULL DEFAULT 6,
  module_base_hours NUMERIC(10,2) NOT NULL DEFAULT 16,
  qa_percentage NUMERIC(8,2) NOT NULL DEFAULT 15,
  pm_percentage NUMERIC(8,2) NOT NULL DEFAULT 10,
  buffer_percentage NUMERIC(8,2) NOT NULL DEFAULT 10,
  complexity_simple_factor NUMERIC(8,4) NOT NULL DEFAULT 0.85,
  complexity_medium_factor NUMERIC(8,4) NOT NULL DEFAULT 1.00,
  complexity_complex_factor NUMERIC(8,4) NOT NULL DEFAULT 1.25,
  complexity_enterprise_factor NUMERIC(8,4) NOT NULL DEFAULT 1.50,
  working_days_per_month NUMERIC(8,2) NOT NULL DEFAULT 22,
  productive_hours_per_day NUMERIC(8,2) NOT NULL DEFAULT 6.5,
  overhead_formula TEXT NOT NULL DEFAULT 'monthly_ops / (working_days * productive_hours)',
  currency TEXT NOT NULL DEFAULT 'INR',
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.cost_center_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Role-wise default hourly cost (estimation roles, not RBAC)
CREATE TABLE IF NOT EXISTS public.cost_center_role_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key TEXT NOT NULL UNIQUE,
  role_label TEXT NOT NULL,
  hourly_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID
);

INSERT INTO public.cost_center_role_rates (role_key, role_label, hourly_cost, sort_order) VALUES
  ('project_lead', 'Project Lead', 1500, 10),
  ('sr_developer', 'Sr Developer', 1200, 20),
  ('developer', 'Developer', 900, 30),
  ('jr_developer', 'Jr Developer', 600, 40),
  ('qa', 'QA', 700, 50),
  ('ui_ux', 'UI/UX', 800, 60),
  ('devops', 'DevOps', 1000, 70),
  ('account_manager', 'Account Manager', 1100, 80),
  ('other', 'Other', 750, 90)
ON CONFLICT (role_key) DO NOTHING;

-- Monthly operational overhead items
CREATE TABLE IF NOT EXISTS public.cost_center_operational_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_name TEXT NOT NULL,
  monthly_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'other',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  CONSTRAINT cost_center_ops_category_chk CHECK (category IN (
    'office_rent','electricity','internet','software','cloud_hosting',
    'admin','hr','utilities','marketing','other'
  ))
);

INSERT INTO public.cost_center_operational_costs (cost_name, monthly_amount, category, sort_order)
SELECT v.cost_name, v.monthly_amount, v.category, v.sort_order
FROM (VALUES
  ('Office Rent', 0::numeric, 'office_rent', 10),
  ('Electricity', 0::numeric, 'electricity', 20),
  ('Internet', 0::numeric, 'internet', 30),
  ('Software', 0::numeric, 'software', 40),
  ('Cloud / Hosting', 0::numeric, 'cloud_hosting', 50),
  ('Admin Cost', 0::numeric, 'admin', 60),
  ('HR Cost', 0::numeric, 'hr', 70),
  ('Utilities', 0::numeric, 'utilities', 80),
  ('Marketing Overhead', 0::numeric, 'marketing', 90),
  ('Other Operational Cost', 0::numeric, 'other', 100)
) AS v(cost_name, monthly_amount, category, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.cost_center_operational_costs LIMIT 1);

-- Estimates
CREATE TABLE IF NOT EXISTS public.cost_center_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_code TEXT NOT NULL UNIQUE,
  estimate_name TEXT NOT NULL,
  client_id UUID REFERENCES public.ops_clients(id),
  project_id UUID REFERENCES public.project_management_projects(id),
  project_type TEXT,
  scope_summary TEXT,
  modules_count INTEGER NOT NULL DEFAULT 0,
  screens_count INTEGER NOT NULL DEFAULT 0,
  apis_count INTEGER NOT NULL DEFAULT 0,
  complexity TEXT NOT NULL DEFAULT 'medium',
  system_estimated_hours NUMERIC(12,2) NOT NULL DEFAULT 0,
  adjusted_hours NUMERIC(12,2),
  final_approved_hours NUMERIC(12,2) NOT NULL DEFAULT 0,
  hours_override BOOLEAN NOT NULL DEFAULT FALSE,
  resource_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  operational_cost_per_hour NUMERIC(14,4) NOT NULL DEFAULT 0,
  project_operational_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  additional_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_internal_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  proposed_client_price NUMERIC(14,2),
  expected_profit NUMERIC(14,2),
  profit_margin_pct NUMERIC(8,2),
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  CONSTRAINT cost_center_estimate_complexity_chk CHECK (complexity IN ('simple','medium','complex','enterprise')),
  CONSTRAINT cost_center_estimate_status_chk CHECK (status IN ('draft','estimated','approved','converted','archived'))
);

CREATE INDEX IF NOT EXISTS cost_center_estimates_status_idx ON public.cost_center_estimates (status);
CREATE INDEX IF NOT EXISTS cost_center_estimates_client_idx ON public.cost_center_estimates (client_id);
CREATE INDEX IF NOT EXISTS cost_center_estimates_project_idx ON public.cost_center_estimates (project_id);
CREATE INDEX IF NOT EXISTS cost_center_estimates_created_idx ON public.cost_center_estimates (created_at DESC);

-- Team allocation per estimate
CREATE TABLE IF NOT EXISTS public.cost_center_estimate_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES public.cost_center_estimates(id) ON DELETE CASCADE,
  role_key TEXT NOT NULL,
  role_label TEXT NOT NULL,
  employee_id UUID REFERENCES public.finance_employees(id),
  designation TEXT,
  hourly_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  cost_overridden BOOLEAN NOT NULL DEFAULT FALSE,
  planned_hours NUMERIC(12,2) NOT NULL DEFAULT 0,
  allocation_pct NUMERIC(8,2) NOT NULL DEFAULT 100,
  total_resource_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 100,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cost_center_estimate_resources_estimate_idx
  ON public.cost_center_estimate_resources (estimate_id);

-- Audit
CREATE TABLE IF NOT EXISTS public.cost_center_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  estimate_id UUID REFERENCES public.cost_center_estimates(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  previous_values JSONB,
  new_values JSONB,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cost_center_audit_created_idx ON public.cost_center_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS cost_center_audit_estimate_idx ON public.cost_center_audit_logs (estimate_id);

NOTIFY pgrst, 'reload schema';
