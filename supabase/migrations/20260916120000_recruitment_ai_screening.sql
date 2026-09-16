-- Recruitment: AI candidate screening & role fit assessment (admin only).

CREATE SEQUENCE IF NOT EXISTS recruitment_role_code_seq START 1;

CREATE OR REPLACE FUNCTION public.recruitment_next_role_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  n INTEGER;
BEGIN
  n := nextval('recruitment_role_code_seq');
  RETURN 'ROLE-' || lpad(n::text, 4, '0');
END;
$$;

CREATE TABLE IF NOT EXISTS public.recruitment_job_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code TEXT UNIQUE,
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  experience_required TEXT,
  employment_type TEXT NOT NULL DEFAULT 'Full-time',
  work_location TEXT,
  job_description TEXT,
  key_responsibilities TEXT,
  required_skills TEXT,
  preferred_skills TEXT,
  minimum_qualification TEXT,
  minimum_screening_score NUMERIC(5,2) NOT NULL DEFAULT 70,
  score_thresholds JSONB NOT NULL DEFAULT '{"excellent":85,"strong":75,"moderate":65,"partial":50}'::jsonb,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'INACTIVE')),
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.recruitment_assessment_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_role_id UUID NOT NULL REFERENCES public.recruitment_job_roles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  weightage NUMERIC(6,2) NOT NULL CHECK (weightage > 0),
  rating_scale_max INTEGER NOT NULL DEFAULT 5 CHECK (rating_scale_max >= 1),
  mandatory BOOLEAN NOT NULL DEFAULT FALSE,
  minimum_required_score NUMERIC(4,2),
  ai_instructions TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS recruitment_assessment_areas_role_idx ON public.recruitment_assessment_areas(job_role_id, display_order);

CREATE TABLE IF NOT EXISTS public.recruitment_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_role_id UUID NOT NULL REFERENCES public.recruitment_job_roles(id) ON DELETE RESTRICT,
  name TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  total_experience TEXT,
  relevant_experience TEXT,
  current_company TEXT,
  current_job_title TEXT,
  current_ctc TEXT,
  expected_ctc TEXT,
  notice_period TEXT,
  source TEXT,
  resume_url TEXT,
  resume_file_name TEXT,
  resume_text TEXT,
  extracted_profile JSONB,
  status TEXT NOT NULL DEFAULT 'NEW',
  application_date DATE NOT NULL DEFAULT CURRENT_DATE,
  overall_fit_percent NUMERIC(5,2),
  ai_classification TEXT,
  ai_recommendation TEXT,
  fit_summary TEXT,
  strengths JSONB,
  gaps JSONB,
  info_to_validate JSONB,
  screening_questions JSONB,
  manual_screening_score NUMERIC(5,2),
  final_score NUMERIC(5,2),
  hr_comments TEXT,
  latest_assessment_id UUID,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS recruitment_candidates_role_idx ON public.recruitment_candidates(job_role_id, created_at DESC);
CREATE INDEX IF NOT EXISTS recruitment_candidates_status_idx ON public.recruitment_candidates(status);

CREATE TABLE IF NOT EXISTS public.recruitment_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.recruitment_candidates(id) ON DELETE CASCADE,
  job_role_id UUID NOT NULL REFERENCES public.recruitment_job_roles(id) ON DELETE RESTRICT,
  overall_fit_percent NUMERIC(5,2) NOT NULL,
  classification TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  fit_summary TEXT,
  strengths JSONB,
  gaps JSONB,
  info_to_validate JSONB,
  screening_questions JSONB,
  area_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_raw JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.recruitment_candidate_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.recruitment_candidates(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.recruitment_candidates
  DROP CONSTRAINT IF EXISTS recruitment_candidates_latest_assessment_fkey;
ALTER TABLE public.recruitment_candidates
  ADD CONSTRAINT recruitment_candidates_latest_assessment_fkey
  FOREIGN KEY (latest_assessment_id) REFERENCES public.recruitment_assessments(id) ON DELETE SET NULL;

ALTER TABLE public.recruitment_job_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_assessment_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_candidate_status_history ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'recruitment_job_roles',
    'recruitment_assessment_areas',
    'recruitment_candidates',
    'recruitment_assessments',
    'recruitment_candidate_status_history'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_admin ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_admin ON public.%I FOR ALL USING (
        EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid())
      ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid())
      )',
      t, t
    );
  END LOOP;
END $$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'recruitment_job_roles',
    'recruitment_assessment_areas',
    'recruitment_candidates'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER %I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      t, t
    );
  END LOOP;
END $$;
