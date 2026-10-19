-- Project delivery + ISMS operational registers.
-- Reuses ops_clients and finance_employees. Does not duplicate HR or clients.

CREATE TABLE IF NOT EXISTS public.project_management_sequences (
  kind TEXT PRIMARY KEY,
  last_value INTEGER NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.pm_next_code(p_prefix TEXT, p_pad INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  n INTEGER;
  prefix TEXT := BTRIM(p_prefix);
  pad INTEGER := GREATEST(COALESCE(p_pad, 3), 1);
BEGIN
  INSERT INTO public.project_management_sequences (kind, last_value)
  VALUES (prefix, 1)
  ON CONFLICT (kind) DO UPDATE SET last_value = public.project_management_sequences.last_value + 1
  RETURNING last_value INTO n;
  RETURN prefix || lpad(n::text, pad, '0');
END;
$$;

CREATE TABLE IF NOT EXISTS public.project_management_project_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS public.project_management_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.project_management_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code TEXT NOT NULL UNIQUE,
  client_id UUID REFERENCES public.ops_clients(id),
  project_name TEXT NOT NULL,
  project_type_id UUID REFERENCES public.project_management_project_types(id),
  category TEXT NOT NULL DEFAULT 'planned_to_onboard',
  priority TEXT NOT NULL DEFAULT 'medium',
  account_manager_id UUID REFERENCES public.finance_employees(id),
  sr_engineer_id UUID REFERENCES public.finance_employees(id),
  lead_developer_id UUID REFERENCES public.finance_employees(id),
  junior_developer_1_id UUID REFERENCES public.finance_employees(id),
  junior_developer_2_id UUID REFERENCES public.finance_employees(id),
  start_date DATE,
  planned_end_date DATE,
  revised_end_date DATE,
  phase_id UUID REFERENCES public.project_management_phases(id),
  next_milestone TEXT,
  milestone_due_date DATE,
  planned_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  hours_before_tracker NUMERIC(10,2) NOT NULL DEFAULT 0,
  signoff_date DATE,
  support_days INTEGER,
  notes TEXT,
  closure_override TEXT,
  archived_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pm_project_category_chk CHECK (category IN ('planned_to_onboard','ongoing','delivered','on_hold','cancelled')),
  CONSTRAINT pm_project_priority_chk CHECK (priority IN ('low','medium','high','critical'))
);

CREATE TABLE IF NOT EXISTS public.project_management_daily_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.project_management_projects(id),
  update_date DATE NOT NULL,
  am_input_received BOOLEAN NOT NULL DEFAULT FALSE,
  rag TEXT,
  completion_percent NUMERIC(5,2),
  work_done TEXT,
  plan_today TEXT,
  team_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  blockers TEXT,
  blocker_owner_id UUID REFERENCES public.finance_employees(id),
  client_dependency TEXT,
  next_action TEXT,
  action_owner_id UUID REFERENCES public.finance_employees(id),
  action_due_date DATE,
  escalate BOOLEAN NOT NULL DEFAULT FALSE,
  manager_remarks TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pm_daily_unique UNIQUE (project_id, update_date),
  CONSTRAINT pm_daily_rag_chk CHECK (rag IS NULL OR rag IN ('green','amber','red'))
);

CREATE TABLE IF NOT EXISTS public.project_management_onboarding (
  project_id UUID PRIMARY KEY REFERENCES public.project_management_projects(id),
  proposal_sent TEXT NOT NULL DEFAULT 'not_filled',
  proposal_accepted TEXT NOT NULL DEFAULT 'not_filled',
  scope_signed TEXT NOT NULL DEFAULT 'not_filled',
  contract_signed TEXT NOT NULL DEFAULT 'not_filled',
  advance_received TEXT NOT NULL DEFAULT 'not_filled',
  client_inputs TEXT NOT NULL DEFAULT 'not_filled',
  accounts_access TEXT NOT NULL DEFAULT 'not_filled',
  team_allocated TEXT NOT NULL DEFAULT 'not_filled',
  kickoff_date DATE,
  remarks TEXT,
  override_reason TEXT,
  override_by UUID,
  version INTEGER NOT NULL DEFAULT 1,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.project_management_team_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL UNIQUE REFERENCES public.finance_employees(id),
  project_role TEXT NOT NULL,
  reports_to_employee_id UUID REFERENCES public.finance_employees(id),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pm_role_chk CHECK (project_role IN ('manager','account_manager','sr_software_engineer','full_stack_developer','jr_full_stack_developer'))
);

CREATE TABLE IF NOT EXISTS public.project_management_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  changed_fields JSONB,
  previous_values JSONB,
  new_values JSONB,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.process_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_name TEXT NOT NULL,
  document_type TEXT,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  description TEXT,
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.process_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  asset_type TEXT,
  brand_model TEXT,
  serial_identifier TEXT,
  classification TEXT,
  assigned_employee_id UUID REFERENCES public.finance_employees(id),
  issue_date DATE,
  status TEXT NOT NULL DEFAULT 'available',
  os_version TEXT,
  encryption TEXT,
  endpoint_protection TEXT,
  last_review DATE,
  return_date DATE,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT process_asset_status_chk CHECK (status IN ('available','assigned','returned','repair','retired','lost'))
);

CREATE TABLE IF NOT EXISTS public.process_access_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  employee_id UUID REFERENCES public.finance_employees(id),
  external_user TEXT,
  system_name TEXT NOT NULL,
  project_id UUID REFERENCES public.project_management_projects(id),
  environment TEXT,
  access_type TEXT,
  business_need TEXT,
  requested_date DATE,
  approved_by_id UUID REFERENCES public.finance_employees(id),
  granted_date DATE,
  last_review DATE,
  status TEXT NOT NULL DEFAULT 'requested',
  revoke_date DATE,
  revoked_by_id UUID REFERENCES public.finance_employees(id),
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT process_access_status_chk CHECK (status IN ('requested','approved','active','revoked','rejected'))
);

CREATE TABLE IF NOT EXISTS public.process_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  provider TEXT,
  service_name TEXT NOT NULL,
  purpose TEXT,
  project_id UUID REFERENCES public.project_management_projects(id),
  environment TEXT,
  region TEXT,
  platform TEXT,
  hostname TEXT,
  owner_id UUID REFERENCES public.finance_employees(id),
  admin_restricted BOOLEAN NOT NULL DEFAULT TRUE,
  mfa_or_ssh BOOLEAN NOT NULL DEFAULT FALSE,
  firewall_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
  backup_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active',
  last_patch DATE,
  last_security_review DATE,
  monitoring_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.process_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  supplier_name TEXT NOT NULL,
  service TEXT,
  data_involved TEXT,
  criticality TEXT NOT NULL DEFAULT 'medium',
  contract_dpa TEXT,
  security_review TEXT,
  owner_id UUID REFERENCES public.finance_employees(id),
  project_id UUID REFERENCES public.project_management_projects(id),
  start_date DATE,
  last_review DATE,
  next_review DATE,
  status TEXT NOT NULL DEFAULT 'active',
  exit_plan TEXT,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT process_supplier_criticality_chk CHECK (criticality IN ('critical','high','medium','low'))
);

CREATE TABLE IF NOT EXISTS public.process_software (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  software_name TEXT NOT NULL,
  purpose TEXT,
  category TEXT,
  version_label TEXT,
  license_type TEXT,
  approved_by_id UUID REFERENCES public.finance_employees(id),
  users_teams TEXT,
  data_handled TEXT,
  auto_update BOOLEAN NOT NULL DEFAULT FALSE,
  last_review DATE,
  status TEXT NOT NULL DEFAULT 'under_review',
  removal_notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT process_software_status_chk CHECK (status IN ('approved','under_review','restricted','deprecated','removed'))
);

CREATE TABLE IF NOT EXISTS public.process_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  system_name TEXT NOT NULL,
  project_id UUID REFERENCES public.project_management_projects(id),
  backup_location TEXT,
  frequency TEXT,
  retention TEXT,
  encrypted BOOLEAN NOT NULL DEFAULT FALSE,
  owner_id UUID REFERENCES public.finance_employees(id),
  last_successful DATE,
  last_restore_test DATE,
  restore_result TEXT,
  next_restore_test DATE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.process_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  reported_date DATE NOT NULL,
  reported_by_id UUID REFERENCES public.finance_employees(id),
  category TEXT,
  affected_system TEXT,
  project_id UUID REFERENCES public.project_management_projects(id),
  severity TEXT NOT NULL DEFAULT 'medium',
  description TEXT,
  containment TEXT,
  owner_id UUID REFERENCES public.finance_employees(id),
  root_cause TEXT,
  corrective_action TEXT,
  status TEXT NOT NULL DEFAULT 'reported',
  closed_date DATE,
  lessons TEXT,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT process_incident_severity_chk CHECK (severity IN ('critical','high','medium','low')),
  CONSTRAINT process_incident_status_chk CHECK (status IN ('reported','investigating','contained','remediation','closed'))
);

CREATE TABLE IF NOT EXISTS public.process_vulnerabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  detected_date DATE,
  asset_application TEXT NOT NULL,
  project_id UUID REFERENCES public.project_management_projects(id),
  source TEXT,
  severity TEXT NOT NULL DEFAULT 'medium',
  description TEXT,
  owner_id UUID REFERENCES public.finance_employees(id),
  target_fix_date DATE,
  remediation TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  verification_date DATE,
  verified_by_id UUID REFERENCES public.finance_employees(id),
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT process_vuln_severity_chk CHECK (severity IN ('critical','high','medium','low')),
  CONSTRAINT process_vuln_status_chk CHECK (status IN ('open','in_progress','fixed','risk_accepted','false_positive','closed'))
);

CREATE TABLE IF NOT EXISTS public.process_training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  training_date DATE,
  topic TEXT NOT NULL,
  trainer TEXT,
  duration TEXT,
  next_refresher DATE,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.process_training_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.process_training_sessions(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.finance_employees(id),
  attendance TEXT NOT NULL DEFAULT 'present',
  acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  remarks TEXT,
  UNIQUE (session_id, employee_id)
);

CREATE TABLE IF NOT EXISTS public.process_joiner_leaver (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  employee_id UUID NOT NULL REFERENCES public.finance_employees(id),
  action_type TEXT NOT NULL,
  role_title TEXT,
  effective_date DATE,
  nda TEXT,
  isms_training TEXT,
  asset_status TEXT,
  email_account TEXT,
  git_access TEXT,
  cloud_access TEXT,
  client_access TEXT,
  mfa TEXT,
  approver_id UUID REFERENCES public.finance_employees(id),
  completion_status TEXT NOT NULL DEFAULT 'open',
  completed_date DATE,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT process_jl_action_chk CHECK (action_type IN ('join','role_change','exit'))
);

CREATE TABLE IF NOT EXISTS public.process_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  request_date DATE,
  project_id UUID REFERENCES public.project_management_projects(id),
  system_name TEXT,
  environment TEXT,
  description TEXT NOT NULL,
  reason TEXT,
  risk_impact TEXT,
  requested_by_id UUID REFERENCES public.finance_employees(id),
  tested_by_id UUID REFERENCES public.finance_employees(id),
  test_result TEXT,
  approved_by_id UUID REFERENCES public.finance_employees(id),
  implementation_date DATE,
  rollback_plan TEXT,
  status TEXT NOT NULL DEFAULT 'requested',
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT process_change_status_chk CHECK (status IN ('requested','testing','approved','scheduled','implemented','failed','rolled_back','closed'))
);

CREATE TABLE IF NOT EXISTS public.process_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  identified_date DATE,
  asset_process TEXT,
  project_id UUID REFERENCES public.project_management_projects(id),
  threat TEXT,
  cause TEXT,
  business_impact TEXT,
  likelihood INTEGER NOT NULL DEFAULT 1,
  impact INTEGER NOT NULL DEFAULT 1,
  existing_controls TEXT,
  treatment TEXT,
  owner_id UUID REFERENCES public.finance_employees(id),
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'open',
  residual_likelihood INTEGER,
  residual_impact INTEGER,
  review_date DATE,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT process_risk_score_chk CHECK (likelihood BETWEEN 1 AND 5 AND impact BETWEEN 1 AND 5),
  CONSTRAINT process_risk_status_chk CHECK (status IN ('open','treating','accepted','closed'))
);

CREATE TABLE IF NOT EXISTS public.process_corrective_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT 'other',
  source_id UUID,
  raised_date DATE,
  project_id UUID REFERENCES public.project_management_projects(id),
  finding TEXT NOT NULL,
  root_cause TEXT,
  corrective_action TEXT,
  owner_id UUID REFERENCES public.finance_employees(id),
  due_date DATE,
  verification_method TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  closure_date DATE,
  verified_by_id UUID REFERENCES public.finance_employees(id),
  effectiveness TEXT,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT process_ca_status_chk CHECK (status IN ('open','in_progress','pending_verification','closed')),
  CONSTRAINT process_ca_source_chk CHECK (source IN ('incident','vulnerability','risk','control','change','audit','other'))
);

CREATE TABLE IF NOT EXISTS public.process_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area TEXT NOT NULL,
  control_check TEXT NOT NULL,
  owner_id UUID REFERENCES public.finance_employees(id),
  frequency TEXT NOT NULL DEFAULT 'monthly',
  required BOOLEAN NOT NULL DEFAULT TRUE,
  current_status TEXT NOT NULL DEFAULT 'not_checked',
  last_checked DATE,
  gap_action TEXT,
  target_date DATE,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT process_control_status_chk CHECK (current_status IN ('compliant','partial','not_compliant','not_checked','na')),
  CONSTRAINT process_control_freq_chk CHECK (frequency IN ('per_event','per_change','monthly','quarterly','annual','on_joining','on_exit','custom'))
);

INSERT INTO public.project_management_project_types (name, sort_order)
SELECT * FROM (VALUES
  ('CMS Website', 1),
  ('E-commerce Website', 2),
  ('Web Application', 3),
  ('Mobile App (Android/iOS)', 4),
  ('Web + Mobile', 5),
  ('ERP / CRM', 6),
  ('SaaS Product', 7),
  ('API / Integration / Automation', 8),
  ('WhatsApp / AI Solution', 9),
  ('UI/UX Design', 10),
  ('Support / AMC', 11),
  ('Internal Product', 12)
) AS v(name, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.project_management_project_types t WHERE t.name = v.name);

INSERT INTO public.project_management_phases (name, sort_order)
SELECT * FROM (VALUES
  ('Discovery', 1),
  ('Requirements & Scope', 2),
  ('Solution / UI-UX & Estimate', 3),
  ('Proposal / Contract', 4),
  ('Kickoff & Setup', 5),
  ('Development', 6),
  ('QA & Security Checks', 7),
  ('UAT & Fixes', 8),
  ('Deployment & Handover', 9),
  ('Warranty / Support', 10),
  ('Closed', 11)
) AS v(name, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.project_management_phases p WHERE p.name = v.name);

INSERT INTO public.process_controls (area, control_check, frequency)
SELECT * FROM (VALUES
  ('Asset Management', 'Assigned assets have an owner and last review', 'quarterly'),
  ('Access Control', 'Active access records reviewed', 'monthly'),
  ('Authentication', 'MFA enabled for active privileged access', 'monthly'),
  ('Cloud / VPS', 'Production servers have restricted admin and firewall review', 'quarterly'),
  ('Backups', 'Critical backups succeeded and restore was tested', 'monthly'),
  ('Vulnerabilities', 'Critical and high vulnerabilities have an owner and target date', 'monthly'),
  ('Secure Development', 'Production changes have test result, approval and rollback', 'per_change'),
  ('Incidents', 'Open incidents have containment and an owner', 'per_event'),
  ('People', 'Joiners completed NDA and ISMS training', 'on_joining'),
  ('Suppliers', 'Critical suppliers have a current security review', 'annual'),
  ('Physical / Office', 'Issued equipment is encrypted and protected', 'quarterly'),
  ('Business Continuity', 'Restore test result recorded for critical data', 'quarterly'),
  ('Risk Management', 'Open risks have treatment, owner and review date', 'quarterly'),
  ('Corrective Action', 'Overdue corrective actions reviewed', 'monthly')
) AS v(area, control_check, frequency)
WHERE NOT EXISTS (SELECT 1 FROM public.process_controls c WHERE c.control_check = v.control_check);

ALTER TABLE public.project_management_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_management_daily_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_management_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_management_team_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_management_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_access_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_software ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_training_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_joiner_leaver ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_management_project_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_management_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_management_sequences ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'project_management_projects','project_management_daily_updates','project_management_onboarding',
    'project_management_team_profiles','project_management_audit_logs','project_management_project_types',
    'project_management_phases','project_management_sequences','process_evidence','process_assets',
    'process_access_records','process_servers','process_suppliers','process_software','process_backups',
    'process_incidents','process_vulnerabilities','process_training_sessions','process_training_attendees',
    'process_joiner_leaver','process_changes','process_risks','process_corrective_actions','process_controls'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_admin ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I_admin ON public.%I FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))',
      tbl, tbl
    );
  END LOOP;
END $$;
