-- Google SEO tags, Search Console extras, and social media marketing fields

ALTER TABLE public.site_seo
  ADD COLUMN IF NOT EXISTS gtm_id TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS ga4_id TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS bing_verification TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS facebook_pixel_id TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS linkedin_partner_id TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS facebook_app_id TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS facebook_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS youtube_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS twitter_url TEXT DEFAULT '';

COMMENT ON COLUMN public.site_seo.gtm_id IS 'Google Tag Manager container ID (GTM-XXXX)';
COMMENT ON COLUMN public.site_seo.ga4_id IS 'Google Analytics 4 measurement ID (G-XXXX)';
COMMENT ON COLUMN public.site_seo.bing_verification IS 'Bing Webmaster Tools verification meta content';
COMMENT ON COLUMN public.site_seo.facebook_pixel_id IS 'Meta (Facebook) Pixel ID for ads tracking';
COMMENT ON COLUMN public.site_seo.linkedin_partner_id IS 'LinkedIn Insight Tag partner ID';
