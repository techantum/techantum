CREATE TABLE IF NOT EXISTS public.admin_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  og_image TEXT,
  og_title TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_apps_created_at ON public.admin_apps (created_at DESC);

DROP TRIGGER IF EXISTS admin_apps_updated_at ON public.admin_apps;
CREATE TRIGGER admin_apps_updated_at
BEFORE UPDATE ON public.admin_apps
FOR EACH ROW EXECUTE FUNCTION public.update_cms_timestamp();

ALTER TABLE public.admin_apps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_apps_admin ON public.admin_apps;
CREATE POLICY admin_apps_admin ON public.admin_apps
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

NOTIFY pgrst, 'reload schema';
