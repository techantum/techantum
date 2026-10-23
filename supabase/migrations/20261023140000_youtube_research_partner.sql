-- Keep each partner's YouTube research projects separate from TechAntum's own projects.

ALTER TABLE public.youtube_research_projects
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_youtube_projects_partner
  ON public.youtube_research_projects (partner_id, status, updated_at DESC);

COMMENT ON COLUMN public.youtube_research_projects.partner_id IS
  'Owning partner. NULL means an internal TechAntum research project.';
