-- SEO head columns missing from site_seo + per-page SEO overrides table

ALTER TABLE public.site_seo
  ADD COLUMN IF NOT EXISTS header_scripts TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS footer_scripts TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS canonical_host TEXT DEFAULT 'non-www',
  ADD COLUMN IF NOT EXISTS index_site BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS follow_site BOOLEAN DEFAULT true;

CREATE TABLE IF NOT EXISTS public.page_seo (
    path TEXT PRIMARY KEY,
    index_enabled BOOLEAN DEFAULT true,
    follow_enabled BOOLEAN DEFAULT true,
    title TEXT,
    description TEXT,
    og_image_url TEXT,
    header_scripts TEXT DEFAULT '',
    footer_scripts TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS page_seo_updated_at ON public.page_seo;
CREATE TRIGGER page_seo_updated_at
BEFORE UPDATE ON public.page_seo
FOR EACH ROW EXECUTE FUNCTION public.update_cms_timestamp();

ALTER TABLE public.page_seo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_page_seo" ON public.page_seo;
CREATE POLICY "public_read_page_seo"
ON public.page_seo FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "admin_manage_page_seo" ON public.page_seo;
CREATE POLICY "admin_manage_page_seo"
ON public.page_seo FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

COMMENT ON TABLE public.page_seo IS 'Per-page SEO overrides: metadata, robots, and head/body snippets';
COMMENT ON COLUMN public.site_seo.header_scripts IS 'Trusted HTML snippets injected into document head (meta, link, script)';
COMMENT ON COLUMN public.site_seo.footer_scripts IS 'Trusted HTML snippets injected before closing body tag';
