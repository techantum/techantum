-- Named saved searches for Lead Discovery.

ALTER TABLE public.lead_discovery_runs
  ADD COLUMN IF NOT EXISTS name TEXT;

UPDATE public.lead_discovery_runs
SET name = trim(both ' ' FROM concat_ws(' · ', nullif(segment, ''), nullif(area, ''), nullif(city, '')))
WHERE name IS NULL OR btrim(name) = '';
