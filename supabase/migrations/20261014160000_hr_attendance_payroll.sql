-- Attendance, leave ledger, holidays, payroll settings and monthly payroll.
-- Additive only. Existing employee and payslip rows are left in place.

ALTER TABLE public.finance_employees
  ADD COLUMN IF NOT EXISTS last_working_date DATE;

ALTER TABLE public.finance_employee_payslips
  ALTER COLUMN lop_days TYPE NUMERIC(8,2) USING lop_days::numeric,
  ALTER COLUMN lpr_days TYPE NUMERIC(8,2) USING lpr_days::numeric;

ALTER TABLE public.finance_employee_payslips
  ADD COLUMN IF NOT EXISTS working_days NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS payable_days NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS paid_leave_days NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS payroll_id UUID,
  ADD COLUMN IF NOT EXISTS payroll_revision INTEGER;

CREATE TABLE IF NOT EXISTS public.hr_payroll_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  weekly_off SMALLINT[] NOT NULL DEFAULT ARRAY[0, 6]::SMALLINT[],
  monthly_leave_credit NUMERIC(6,2) NOT NULL DEFAULT 1,
  max_paid_leave_per_month NUMERIC(6,2) NOT NULL DEFAULT 5,
  carry_forward BOOLEAN NOT NULL DEFAULT TRUE,
  half_day_value NUMERIC(4,2) NOT NULL DEFAULT 0.5,
  currency TEXT NOT NULL DEFAULT 'INR',
  approval_required BOOLEAN NOT NULL DEFAULT TRUE,
  joining_month_credit TEXT NOT NULL DEFAULT 'full',
  opening_balance_default NUMERIC(8,2) NOT NULL DEFAULT 0,
  prorate_rule TEXT NOT NULL DEFAULT 'eligible_working_days',
  rounding_mode TEXT NOT NULL DEFAULT 'half_up_paise',
  version INTEGER NOT NULL DEFAULT 1,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hr_payroll_settings_credit_chk CHECK (joining_month_credit IN ('full', 'none')),
  CONSTRAINT hr_payroll_settings_prorate_chk CHECK (prorate_rule = 'eligible_working_days'),
  CONSTRAINT hr_payroll_settings_round_chk CHECK (rounding_mode = 'half_up_paise')
);

INSERT INTO public.hr_payroll_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.hr_payroll_settings_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL UNIQUE,
  settings JSONB NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hr_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  holiday_type TEXT NOT NULL DEFAULT 'company',
  year INTEGER NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_holidays_year ON public.hr_holidays (year, holiday_date);

CREATE TABLE IF NOT EXISTS public.hr_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.finance_employees(id) ON DELETE RESTRICT,
  attendance_date DATE NOT NULL,
  status TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hr_attendance_unique UNIQUE (employee_id, attendance_date),
  CONSTRAINT hr_attendance_status_chk CHECK (status IN ('P', 'PL', 'HD', 'UL', 'UHD'))
);

CREATE INDEX IF NOT EXISTS idx_hr_attendance_date ON public.hr_attendance (attendance_date);

CREATE TABLE IF NOT EXISTS public.hr_attendance_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  attendance_date DATE NOT NULL,
  previous_status TEXT,
  next_status TEXT,
  reason TEXT,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_attendance_audit_employee
  ON public.hr_attendance_audit (employee_id, attendance_date, changed_at DESC);

CREATE TABLE IF NOT EXISTS public.hr_leave_openings (
  employee_id UUID PRIMARY KEY REFERENCES public.finance_employees(id) ON DELETE RESTRICT,
  balance NUMERIC(8,2) NOT NULL,
  effective_year INTEGER NOT NULL,
  effective_month INTEGER NOT NULL CHECK (effective_month BETWEEN 1 AND 12),
  note TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hr_leave_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.finance_employees(id) ON DELETE RESTRICT,
  payroll_year INTEGER NOT NULL,
  payroll_month INTEGER NOT NULL CHECK (payroll_month BETWEEN 1 AND 12),
  amount NUMERIC(8,2) NOT NULL,
  reason TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_leave_adjustments_period
  ON public.hr_leave_adjustments (employee_id, payroll_year, payroll_month);

CREATE TABLE IF NOT EXISTS public.hr_leave_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.finance_employees(id) ON DELETE RESTRICT,
  payroll_year INTEGER NOT NULL,
  payroll_month INTEGER NOT NULL CHECK (payroll_month BETWEEN 1 AND 12),
  opening_balance NUMERIC(8,2) NOT NULL,
  monthly_credit NUMERIC(8,2) NOT NULL,
  adjustment NUMERIC(8,2) NOT NULL DEFAULT 0,
  available_balance NUMERIC(8,2) NOT NULL,
  requested_paid NUMERIC(8,2) NOT NULL,
  allowed_paid NUMERIC(8,2) NOT NULL,
  excess_paid NUMERIC(8,2) NOT NULL,
  unpaid_leave NUMERIC(8,2) NOT NULL,
  closing_balance NUMERIC(8,2) NOT NULL,
  settings_version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hr_leave_ledger_unique UNIQUE (employee_id, payroll_year, payroll_month),
  CONSTRAINT hr_leave_ledger_status_chk CHECK (status IN ('draft', 'locked'))
);

CREATE TABLE IF NOT EXISTS public.hr_monthly_payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.finance_employees(id) ON DELETE RESTRICT,
  payroll_year INTEGER NOT NULL,
  payroll_month INTEGER NOT NULL CHECK (payroll_month BETWEEN 1 AND 12),
  revision INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  monthly_gross NUMERIC(14,2) NOT NULL,
  annual_ctc NUMERIC(14,2),
  company_working_days INTEGER NOT NULL,
  eligible_working_days NUMERIC(8,2) NOT NULL,
  present_days NUMERIC(8,2) NOT NULL,
  paid_leave_days NUMERIC(8,2) NOT NULL,
  unpaid_leave NUMERIC(8,2) NOT NULL,
  half_days INTEGER NOT NULL DEFAULT 0,
  lop_days NUMERIC(8,2) NOT NULL,
  pending_days INTEGER NOT NULL DEFAULT 0,
  payable_days NUMERIC(8,2) NOT NULL,
  per_day_salary NUMERIC(14,4) NOT NULL,
  prorated_gross NUMERIC(14,2) NOT NULL,
  lop_deduction NUMERIC(14,2) NOT NULL,
  gross_payable NUMERIC(14,2) NOT NULL,
  additional_earnings NUMERIC(14,2) NOT NULL DEFAULT 0,
  other_deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
  professional_tax NUMERIC(14,2) NOT NULL DEFAULT 0,
  pf_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_payable NUMERIC(14,2) NOT NULL,
  settings_version INTEGER NOT NULL,
  snapshot JSONB,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  paid_by UUID,
  paid_at TIMESTAMPTZ,
  payslip_id UUID,
  revision_reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hr_payroll_revision_unique UNIQUE (employee_id, payroll_year, payroll_month, revision),
  CONSTRAINT hr_payroll_status_chk CHECK (status IN (
    'draft', 'attendance_pending', 'ready_for_approval', 'approved', 'paid'
  ))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hr_payroll_one_current
  ON public.hr_monthly_payroll (employee_id, payroll_year, payroll_month)
  WHERE is_current;

CREATE INDEX IF NOT EXISTS idx_hr_payroll_period
  ON public.hr_monthly_payroll (payroll_year, payroll_month, status);

CREATE TABLE IF NOT EXISTS public.hr_payroll_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_id UUID NOT NULL REFERENCES public.hr_monthly_payroll(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT,
  actor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'finance_payslips_payroll_fk'
  ) THEN
    ALTER TABLE public.finance_employee_payslips
      ADD CONSTRAINT finance_payslips_payroll_fk
      FOREIGN KEY (payroll_id) REFERENCES public.hr_monthly_payroll(id) ON DELETE SET NULL;
  END IF;
END $$;
