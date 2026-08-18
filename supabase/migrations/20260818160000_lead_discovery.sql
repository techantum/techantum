-- Lead Discovery: Google Places search runs and saved results for field sales.

CREATE TABLE IF NOT EXISTS public.lead_discovery_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID,
  city TEXT NOT NULL,
  area TEXT NOT NULL,
  segment TEXT NOT NULL,
  text_query TEXT NOT NULL,
  min_rating NUMERIC(2,1),
  has_website_filter TEXT NOT NULL DEFAULT 'any' CHECK (has_website_filter IN ('any', 'yes', 'no')),
  has_phone_filter TEXT NOT NULL DEFAULT 'any' CHECK (has_phone_filter IN ('any', 'yes', 'no')),
  raw_count INTEGER NOT NULL DEFAULT 0,
  result_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.lead_discovery_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.lead_discovery_runs(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL,
  business_name TEXT NOT NULL,
  formatted_address TEXT,
  primary_type TEXT,
  types JSONB NOT NULL DEFAULT '[]'::jsonb,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  google_maps_uri TEXT,
  phone TEXT,
  website_uri TEXT,
  rating NUMERIC(2,1),
  review_count INTEGER,
  business_status TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('high', 'medium', 'normal')),
  lead_status TEXT NOT NULL DEFAULT 'new' CHECK (lead_status IN ('new', 'contacted', 'qualified', 'closed', 'skipped')),
  notes TEXT,
  city TEXT,
  area TEXT,
  segment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(run_id, place_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_discovery_runs_created ON public.lead_discovery_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_discovery_results_run ON public.lead_discovery_results(run_id);
CREATE INDEX IF NOT EXISTS idx_lead_discovery_results_place ON public.lead_discovery_results(place_id);
CREATE INDEX IF NOT EXISTS idx_lead_discovery_results_priority ON public.lead_discovery_results(priority);

ALTER TABLE public.lead_discovery_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_discovery_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lead_discovery_runs_admin ON public.lead_discovery_runs;
CREATE POLICY lead_discovery_runs_admin ON public.lead_discovery_runs
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS lead_discovery_results_admin ON public.lead_discovery_results;
CREATE POLICY lead_discovery_results_admin ON public.lead_discovery_results
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
