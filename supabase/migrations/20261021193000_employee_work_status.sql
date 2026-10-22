ALTER TABLE public.finance_employees
  ADD COLUMN IF NOT EXISTS employment_status TEXT NOT NULL DEFAULT 'regular';

ALTER TABLE public.finance_employees
  DROP CONSTRAINT IF EXISTS finance_employees_employment_status_chk;

ALTER TABLE public.finance_employees
  ADD CONSTRAINT finance_employees_employment_status_chk
  CHECK (employment_status IN ('probation', 'regular', 'part_time'));
