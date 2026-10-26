CREATE TABLE IF NOT EXISTS public.saas_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'starter',
  status TEXT NOT NULL DEFAULT 'trialing',
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.saas_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.saas_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  email TEXT,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_saas_memberships_user ON public.saas_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_saas_accounts_email ON public.saas_accounts (email);

ALTER TABLE public.youtube_research_projects
  ADD COLUMN IF NOT EXISTS saas_account_id UUID REFERENCES public.saas_accounts(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_youtube_projects_saas ON public.youtube_research_projects (saas_account_id, status, updated_at DESC);

ALTER TABLE public.lead_discovery_runs
  ADD COLUMN IF NOT EXISTS saas_account_id UUID REFERENCES public.saas_accounts(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_lead_discovery_runs_saas ON public.lead_discovery_runs (saas_account_id, created_at DESC);
