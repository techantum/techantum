ALTER TABLE public.site_seo
  ADD COLUMN IF NOT EXISTS sitemap_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS robots_extra TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS google_ads_id TEXT DEFAULT '';

COMMENT ON COLUMN public.site_seo.sitemap_enabled IS 'When false, sitemap.xml is empty and robots.txt omits the sitemap URL';
COMMENT ON COLUMN public.site_seo.robots_extra IS 'Extra Allow/Disallow lines merged into robots.txt';
COMMENT ON COLUMN public.site_seo.google_ads_id IS 'Google Ads conversion ID (AW-XXXX)';
