ALTER TABLE public.cms_content
  ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.cms_pages (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  route TEXT NOT NULL DEFAULT '/',
  description TEXT NOT NULL DEFAULT '',
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 200,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.site_seo
  ADD COLUMN IF NOT EXISTS header_scripts_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS footer_scripts_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS scripts_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scripts_updated_by TEXT;

ALTER TABLE public.site_branding
  ADD COLUMN IF NOT EXISTS updated_by TEXT;

DROP TRIGGER IF EXISTS cms_pages_updated_at ON public.cms_pages;
CREATE TRIGGER cms_pages_updated_at
BEFORE UPDATE ON public.cms_pages
FOR EACH ROW EXECUTE FUNCTION public.update_cms_timestamp();

ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cms_pages_admin ON public.cms_pages;
CREATE POLICY cms_pages_admin ON public.cms_pages
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS cms_pages_public_read ON public.cms_pages;
CREATE POLICY cms_pages_public_read ON public.cms_pages
  FOR SELECT USING (true);
