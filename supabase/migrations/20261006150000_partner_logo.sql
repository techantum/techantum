-- Partner company logo shown on portal login, sidebar, and dashboard.

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

NOTIFY pgrst, 'reload schema';
