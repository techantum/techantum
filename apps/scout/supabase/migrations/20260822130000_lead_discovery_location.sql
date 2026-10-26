ALTER TABLE public.lead_discovery_runs
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT;
