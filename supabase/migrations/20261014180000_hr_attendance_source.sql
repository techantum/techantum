ALTER TABLE public.hr_attendance
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_ref TEXT;

ALTER TABLE public.hr_attendance
  DROP CONSTRAINT IF EXISTS hr_attendance_source_chk;

ALTER TABLE public.hr_attendance
  ADD CONSTRAINT hr_attendance_source_chk CHECK (source ~ '^[a-z][a-z0-9_-]{1,31}$');

CREATE UNIQUE INDEX IF NOT EXISTS idx_hr_attendance_external
  ON public.hr_attendance (source, external_ref)
  WHERE external_ref IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.hr_attendance_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  external_ref TEXT NOT NULL,
  employee_id UUID,
  attendance_date DATE,
  status TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  applied BOOLEAN NOT NULL DEFAULT FALSE,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hr_attendance_imports_unique UNIQUE (source, external_ref),
  CONSTRAINT hr_attendance_imports_source_chk CHECK (source ~ '^[a-z][a-z0-9_-]{1,31}$')
);

CREATE INDEX IF NOT EXISTS idx_hr_attendance_imports_employee
  ON public.hr_attendance_imports (employee_id, attendance_date);
