ALTER TABLE public.project_management_projects DROP CONSTRAINT IF EXISTS pm_project_category_chk;
ALTER TABLE public.project_management_projects
  ADD CONSTRAINT pm_project_category_chk
  CHECK (category IN ('planned_to_onboard', 'onboarded', 'ongoing', 'delivered', 'on_hold', 'cancelled'));

CREATE TABLE IF NOT EXISTS public.project_management_project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.project_management_projects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('file', 'url')),
  label TEXT,
  external_url TEXT,
  storage_path TEXT,
  original_filename TEXT,
  mime_type TEXT,
  file_size INTEGER,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_project_files_project
  ON public.project_management_project_files (project_id, created_at DESC);

ALTER TABLE public.project_management_project_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_management_project_files_admin ON public.project_management_project_files;
CREATE POLICY project_management_project_files_admin ON public.project_management_project_files
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
