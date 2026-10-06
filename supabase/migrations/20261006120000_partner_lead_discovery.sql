-- Super admin can grant Lead Discovery to individual partners.

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS lead_discovery_enabled BOOLEAN NOT NULL DEFAULT FALSE;

NOTIFY pgrst, 'reload schema';
