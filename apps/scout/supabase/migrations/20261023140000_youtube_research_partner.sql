-- Optional partner_id for shared-database installs. Revealeo scopes rows with saas_account_id.

ALTER TABLE public.youtube_research_projects
  ADD COLUMN IF NOT EXISTS partner_id UUID;

CREATE INDEX IF NOT EXISTS idx_youtube_projects_partner
  ON public.youtube_research_projects (partner_id, status, updated_at DESC);

COMMENT ON COLUMN public.youtube_research_projects.partner_id IS
  'Legacy partner owner when sharing a database. Revealeo uses saas_account_id.';
