-- SEO & Google Ads workspace: page metadata extras, keywords, ad assets, drafts, audits, Google connections.

ALTER TABLE public.page_seo
  ADD COLUMN IF NOT EXISTS primary_keyword TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS secondary_keywords TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS og_title TEXT,
  ADD COLUMN IF NOT EXISTS og_description TEXT,
  ADD COLUMN IF NOT EXISTS canonical_url TEXT,
  ADD COLUMN IF NOT EXISTS publish_state TEXT DEFAULT 'published';

CREATE TABLE IF NOT EXISTS public.marketing_service_categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.marketing_seo_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  keyword_norm TEXT NOT NULL,
  usage_type TEXT NOT NULL DEFAULT 'seo' CHECK (usage_type IN ('seo', 'ads', 'both')),
  is_negative BOOLEAN NOT NULL DEFAULT false,
  service_category TEXT NOT NULL DEFAULT 'website-development',
  search_intent TEXT DEFAULT '',
  target_location TEXT DEFAULT 'Hyderabad',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  match_type TEXT DEFAULT 'phrase' CHECK (match_type IN ('broad', 'phrase', 'exact')),
  target_url TEXT DEFAULT '',
  campaign_draft_id UUID,
  source TEXT DEFAULT 'manual',
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  impressions_manual NUMERIC,
  clicks_manual NUMERIC,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS marketing_seo_keywords_unique_norm
  ON public.marketing_seo_keywords (keyword_norm, usage_type, is_negative);

CREATE TABLE IF NOT EXISTS public.marketing_ads_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type TEXT NOT NULL CHECK (asset_type IN ('headline', 'description', 'callout', 'sitelink', 'snippet', 'keyword_collection', 'negative_collection')),
  text TEXT NOT NULL,
  description TEXT DEFAULT '',
  url TEXT DEFAULT '',
  service_category TEXT NOT NULL DEFAULT 'general',
  campaign_draft_id UUID,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('draft', 'approved', 'archived')),
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  notes TEXT DEFAULT '',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.marketing_ads_asset_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.marketing_ads_assets(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.marketing_campaign_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  objective TEXT DEFAULT 'leads',
  service_category TEXT DEFAULT 'website-development',
  target_location TEXT DEFAULT 'Hyderabad, India',
  landing_page TEXT DEFAULT 'https://techantum.com/',
  notes TEXT DEFAULT '',
  budget_estimate TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'archived')),
  keyword_ids UUID[] DEFAULT '{}',
  negative_keyword_ids UUID[] DEFAULT '{}',
  headline_ids UUID[] DEFAULT '{}',
  description_ids UUID[] DEFAULT '{}',
  callout_ids UUID[] DEFAULT '{}',
  sitelink_ids UUID[] DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.marketing_audit_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'complete' CHECK (status IN ('running', 'complete', 'failed')),
  health_score INTEGER,
  summary JSONB NOT NULL DEFAULT '{}',
  error TEXT,
  created_by UUID,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.marketing_audit_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.marketing_audit_runs(id) ON DELETE CASCADE,
  check_name TEXT NOT NULL,
  affected_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('passed', 'warning', 'failed', 'not_tested')),
  issue_description TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  recommended_action TEXT NOT NULL DEFAULT '',
  fix_status TEXT NOT NULL DEFAULT 'open' CHECK (fix_status IN ('open', 'in_progress', 'completed_manual', 'verified')),
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.marketing_google_connections (
  id TEXT PRIMARY KEY,
  encrypted_refresh_token TEXT,
  google_email TEXT,
  property_uri TEXT,
  connected_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  extra JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.marketing_gsc_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  range_start DATE,
  range_end DATE,
  clicks NUMERIC,
  impressions NUMERIC,
  ctr NUMERIC,
  position NUMERIC,
  queries JSONB NOT NULL DEFAULT '[]',
  pages JSONB NOT NULL DEFAULT '[]',
  sitemaps JSONB NOT NULL DEFAULT '[]',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.marketing_page_seo_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL,
  snapshot JSONB NOT NULL,
  changed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.marketing_local_seo_checks (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'not_applicable')),
  notes TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS marketing_seo_keywords_updated_at ON public.marketing_seo_keywords;
CREATE TRIGGER marketing_seo_keywords_updated_at
BEFORE UPDATE ON public.marketing_seo_keywords
FOR EACH ROW EXECUTE FUNCTION public.update_cms_timestamp();

DROP TRIGGER IF EXISTS marketing_ads_assets_updated_at ON public.marketing_ads_assets;
CREATE TRIGGER marketing_ads_assets_updated_at
BEFORE UPDATE ON public.marketing_ads_assets
FOR EACH ROW EXECUTE FUNCTION public.update_cms_timestamp();

DROP TRIGGER IF EXISTS marketing_campaign_drafts_updated_at ON public.marketing_campaign_drafts;
CREATE TRIGGER marketing_campaign_drafts_updated_at
BEFORE UPDATE ON public.marketing_campaign_drafts
FOR EACH ROW EXECUTE FUNCTION public.update_cms_timestamp();

ALTER TABLE public.marketing_service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_seo_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_ads_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_ads_asset_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaign_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_audit_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_google_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_gsc_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_page_seo_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_local_seo_checks ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'marketing_service_categories',
    'marketing_seo_keywords',
    'marketing_ads_assets',
    'marketing_ads_asset_versions',
    'marketing_campaign_drafts',
    'marketing_audit_runs',
    'marketing_audit_issues',
    'marketing_google_connections',
    'marketing_gsc_snapshots',
    'marketing_page_seo_history',
    'marketing_local_seo_checks'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS admin_manage_%s ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY admin_manage_%s ON public.%I FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))',
      tbl, tbl
    );
  END LOOP;
END $$;

INSERT INTO public.marketing_service_categories (id, label, sort_order) VALUES
  ('website-development', 'Website Development', 10),
  ('ecommerce-development', 'Ecommerce Development', 20),
  ('web-application-development', 'Web Application Development', 30),
  ('mobile-app-development', 'Mobile App Development', 40),
  ('erp-development', 'ERP Development', 50),
  ('crm-development', 'CRM Development', 60),
  ('custom-software-development', 'Custom Software Development', 70),
  ('saas-development', 'SaaS Development', 80),
  ('api-integration', 'API Integration', 90),
  ('business-automation', 'Business Automation', 100),
  ('general', 'General', 110)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.marketing_local_seo_checks (id, label, status) VALUES
  ('verified', 'Business verified', 'pending'),
  ('address', 'Correct office address and map pin', 'pending'),
  ('category', 'Correct primary category', 'pending'),
  ('contact', 'Contact information updated', 'pending'),
  ('services', 'Services updated', 'pending'),
  ('photos', 'Photos added', 'pending'),
  ('reviews', 'Reviews monitored', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.marketing_google_connections (id, extra) VALUES
  ('gsc', '{}'::jsonb),
  ('ads', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;
