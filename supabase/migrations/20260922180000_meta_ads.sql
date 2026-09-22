-- Meta Marketing API (ads_read) sync: ad accounts, campaigns, ad sets, ads, insights, and request logs.
-- WhatsApp Graph traffic is intentionally kept out of these tables.

CREATE OR REPLACE FUNCTION public.meta_ads_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.meta_ads_accounts (
  id TEXT PRIMARY KEY,
  name TEXT,
  account_status INTEGER,
  currency TEXT,
  timezone_name TEXT,
  amount_spent TEXT,
  balance TEXT,
  business_id TEXT,
  business_name TEXT,
  disable_reason TEXT,
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.meta_ads_campaigns (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES public.meta_ads_accounts(id) ON DELETE CASCADE,
  name TEXT,
  status TEXT,
  effective_status TEXT,
  objective TEXT,
  daily_budget TEXT,
  lifetime_budget TEXT,
  start_time TIMESTAMPTZ,
  stop_time TIMESTAMPTZ,
  created_time TIMESTAMPTZ,
  updated_time TIMESTAMPTZ,
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS meta_ads_campaigns_account_idx ON public.meta_ads_campaigns(account_id, status);

CREATE TABLE IF NOT EXISTS public.meta_ads_adsets (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES public.meta_ads_accounts(id) ON DELETE CASCADE,
  campaign_id TEXT REFERENCES public.meta_ads_campaigns(id) ON DELETE SET NULL,
  name TEXT,
  status TEXT,
  effective_status TEXT,
  optimization_goal TEXT,
  daily_budget TEXT,
  created_time TIMESTAMPTZ,
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS meta_ads_adsets_account_idx ON public.meta_ads_adsets(account_id, campaign_id);

CREATE TABLE IF NOT EXISTS public.meta_ads_ads (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES public.meta_ads_accounts(id) ON DELETE CASCADE,
  campaign_id TEXT,
  adset_id TEXT REFERENCES public.meta_ads_adsets(id) ON DELETE SET NULL,
  name TEXT,
  status TEXT,
  effective_status TEXT,
  created_time TIMESTAMPTZ,
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS meta_ads_ads_account_idx ON public.meta_ads_ads(account_id, adset_id);

CREATE TABLE IF NOT EXISTS public.meta_ads_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT REFERENCES public.meta_ads_accounts(id) ON DELETE CASCADE,
  object_type TEXT NOT NULL CHECK (object_type IN ('account', 'campaign', 'adset', 'ad')),
  object_id TEXT NOT NULL,
  date_start DATE NOT NULL,
  date_stop DATE NOT NULL,
  impressions BIGINT,
  reach BIGINT,
  clicks BIGINT,
  unique_clicks BIGINT,
  spend NUMERIC,
  cpc NUMERIC,
  cpm NUMERIC,
  ctr NUMERIC,
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (object_type, object_id, date_start, date_stop)
);

CREATE INDEX IF NOT EXISTS meta_ads_insights_object_idx ON public.meta_ads_insights(object_type, object_id, date_stop DESC);
CREATE INDEX IF NOT EXISTS meta_ads_insights_account_idx ON public.meta_ads_insights(account_id, object_type);

CREATE TABLE IF NOT EXISTS public.meta_ads_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETE', 'FAILED')),
  token_source TEXT,
  triggered_by UUID,
  started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMPTZ,
  request_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  accounts_synced INTEGER NOT NULL DEFAULT 0,
  campaigns_synced INTEGER NOT NULL DEFAULT 0,
  adsets_synced INTEGER NOT NULL DEFAULT 0,
  ads_synced INTEGER NOT NULL DEFAULT 0,
  insight_rows INTEGER NOT NULL DEFAULT 0,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS meta_ads_sync_runs_started_idx ON public.meta_ads_sync_runs(started_at DESC);

CREATE TABLE IF NOT EXISTS public.meta_ads_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_run_id UUID REFERENCES public.meta_ads_sync_runs(id) ON DELETE SET NULL,
  ad_account_id TEXT,
  operation TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  http_status INTEGER,
  meta_error_code TEXT,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  duration_ms INTEGER,
  error_message TEXT,
  sanitized_query JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS meta_ads_api_logs_created_idx ON public.meta_ads_api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS meta_ads_api_logs_run_idx ON public.meta_ads_api_logs(sync_run_id, created_at DESC);
CREATE INDEX IF NOT EXISTS meta_ads_api_logs_success_idx ON public.meta_ads_api_logs(success, created_at DESC);

DROP TRIGGER IF EXISTS meta_ads_accounts_updated_at ON public.meta_ads_accounts;
CREATE TRIGGER meta_ads_accounts_updated_at
  BEFORE UPDATE ON public.meta_ads_accounts
  FOR EACH ROW EXECUTE FUNCTION public.meta_ads_touch_updated_at();

DROP TRIGGER IF EXISTS meta_ads_campaigns_updated_at ON public.meta_ads_campaigns;
CREATE TRIGGER meta_ads_campaigns_updated_at
  BEFORE UPDATE ON public.meta_ads_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.meta_ads_touch_updated_at();

DROP TRIGGER IF EXISTS meta_ads_adsets_updated_at ON public.meta_ads_adsets;
CREATE TRIGGER meta_ads_adsets_updated_at
  BEFORE UPDATE ON public.meta_ads_adsets
  FOR EACH ROW EXECUTE FUNCTION public.meta_ads_touch_updated_at();

DROP TRIGGER IF EXISTS meta_ads_ads_updated_at ON public.meta_ads_ads;
CREATE TRIGGER meta_ads_ads_updated_at
  BEFORE UPDATE ON public.meta_ads_ads
  FOR EACH ROW EXECUTE FUNCTION public.meta_ads_touch_updated_at();

ALTER TABLE public.meta_ads_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ads_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ads_adsets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ads_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ads_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ads_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ads_api_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.meta_ads_accounts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.meta_ads_campaigns FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.meta_ads_adsets FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.meta_ads_ads FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.meta_ads_insights FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.meta_ads_sync_runs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.meta_ads_api_logs FROM PUBLIC, anon, authenticated;

GRANT ALL ON public.meta_ads_accounts TO service_role;
GRANT ALL ON public.meta_ads_campaigns TO service_role;
GRANT ALL ON public.meta_ads_adsets TO service_role;
GRANT ALL ON public.meta_ads_ads TO service_role;
GRANT ALL ON public.meta_ads_insights TO service_role;
GRANT ALL ON public.meta_ads_sync_runs TO service_role;
GRANT ALL ON public.meta_ads_api_logs TO service_role;

NOTIFY pgrst, 'reload schema';
