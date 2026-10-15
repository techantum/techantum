-- Employee payroll profile and generated payslip breakdown.

ALTER TABLE public.finance_employees ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.finance_employees ADD COLUMN IF NOT EXISTS date_of_joining DATE;
ALTER TABLE public.finance_employees ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.finance_employees ADD COLUMN IF NOT EXISTS bank_account_no TEXT;
ALTER TABLE public.finance_employees ADD COLUMN IF NOT EXISTS pan TEXT;
ALTER TABLE public.finance_employees ADD COLUMN IF NOT EXISTS work_location TEXT;
ALTER TABLE public.finance_employees ADD COLUMN IF NOT EXISTS annual_ctc NUMERIC(14,2);

ALTER TABLE public.finance_employee_payslips ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'upload';
ALTER TABLE public.finance_employee_payslips ADD COLUMN IF NOT EXISTS days_in_month INTEGER;
ALTER TABLE public.finance_employee_payslips ADD COLUMN IF NOT EXISTS lop_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.finance_employee_payslips ADD COLUMN IF NOT EXISTS lpr_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.finance_employee_payslips ADD COLUMN IF NOT EXISTS basic_amount NUMERIC(14,2);
ALTER TABLE public.finance_employee_payslips ADD COLUMN IF NOT EXISTS hra_amount NUMERIC(14,2);
ALTER TABLE public.finance_employee_payslips ADD COLUMN IF NOT EXISTS leave_encashment NUMERIC(14,2);
ALTER TABLE public.finance_employee_payslips ADD COLUMN IF NOT EXISTS special_allowance NUMERIC(14,2);
ALTER TABLE public.finance_employee_payslips ADD COLUMN IF NOT EXISTS pda_amount NUMERIC(14,2);
ALTER TABLE public.finance_employee_payslips ADD COLUMN IF NOT EXISTS convenience_allowance NUMERIC(14,2);
ALTER TABLE public.finance_employee_payslips ADD COLUMN IF NOT EXISTS professional_tax NUMERIC(14,2);
ALTER TABLE public.finance_employee_payslips ADD COLUMN IF NOT EXISTS pf_amount NUMERIC(14,2);
ALTER TABLE public.finance_employee_payslips ADD COLUMN IF NOT EXISTS lop_amount NUMERIC(14,2);
ALTER TABLE public.finance_employee_payslips ADD COLUMN IF NOT EXISTS gross_earning NUMERIC(14,2);
ALTER TABLE public.finance_employee_payslips ADD COLUMN IF NOT EXISTS gross_deduction NUMERIC(14,2);
ALTER TABLE public.finance_employee_payslips ADD COLUMN IF NOT EXISTS net_pay NUMERIC(14,2);
ALTER TABLE public.finance_employee_payslips ADD COLUMN IF NOT EXISTS annual_ctc NUMERIC(14,2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'finance_payslips_source_chk'
  ) THEN
    ALTER TABLE public.finance_employee_payslips
      ADD CONSTRAINT finance_payslips_source_chk CHECK (source IN ('upload', 'generated'));
  END IF;
END $$;
