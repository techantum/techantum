ALTER TABLE public.hr_payroll_settings
  ADD COLUMN IF NOT EXISTS salary_visibility TEXT NOT NULL DEFAULT 'visible';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'hr_payroll_settings_salary_visibility_chk'
  ) THEN
    ALTER TABLE public.hr_payroll_settings
      ADD CONSTRAINT hr_payroll_settings_salary_visibility_chk
      CHECK (salary_visibility IN ('visible', 'blur', 'hidden'));
  END IF;
END $$;
