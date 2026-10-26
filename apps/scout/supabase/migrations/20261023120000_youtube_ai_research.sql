CREATE TABLE IF NOT EXISTS public.youtube_ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.youtube_research_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  limitations TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  provider TEXT,
  model TEXT,
  error_summary TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT youtube_ai_analyses_status_chk CHECK (status IN ('draft', 'generating', 'ready', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_youtube_ai_analyses_project ON public.youtube_ai_analyses (project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.youtube_ai_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.youtube_ai_analyses(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.youtube_research_projects(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.youtube_videos(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'content',
  title TEXT NOT NULL,
  description TEXT,
  kind TEXT NOT NULL DEFAULT 'existing',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'proposed',
  metric TEXT,
  review_period TEXT,
  evidence_notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT youtube_ai_actions_kind_chk CHECK (kind IN ('existing', 'new')),
  CONSTRAINT youtube_ai_actions_priority_chk CHECK (priority IN ('high', 'medium', 'low')),
  CONSTRAINT youtube_ai_actions_status_chk CHECK (status IN ('proposed', 'approved', 'in_progress', 'implemented', 'under_review', 'completed', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_youtube_ai_actions_project ON public.youtube_ai_actions (project_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.youtube_research_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.youtube_research_projects(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES public.youtube_ai_analyses(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  report_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_by UUID,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT youtube_research_reports_status_chk CHECK (status IN ('draft', 'generating', 'ready', 'failed', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_youtube_research_reports_project ON public.youtube_research_reports (project_id, generated_at DESC);
