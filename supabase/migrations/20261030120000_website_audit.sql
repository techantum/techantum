-- Website Audit Phase 1

CREATE TABLE IF NOT EXISTS website_audit_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  default_max_pages INTEGER NOT NULL DEFAULT 10,
  max_pages INTEGER NOT NULL DEFAULT 25,
  ai_review_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ai_max_pages INTEGER NOT NULL DEFAULT 5,
  desktop_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  mobile_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  lighthouse_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  accessibility_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  forms_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  score_weights JSONB NOT NULL DEFAULT '{"seo":20,"accessibility":15,"performance":15,"ui":15,"ux":0,"responsive":15,"content":10,"forms":10}'::jsonb,
  severity_penalties JSONB NOT NULL DEFAULT '{"critical":25,"high":12,"medium":6,"low":2,"suggestion":0}'::jsonb,
  ai_confidence_threshold NUMERIC NOT NULL DEFAULT 0.6,
  crawl_delay_ms INTEGER NOT NULL DEFAULT 250,
  page_timeout_ms INTEGER NOT NULL DEFAULT 20000,
  max_depth INTEGER NOT NULL DEFAULT 4,
  max_content_chars INTEGER NOT NULL DEFAULT 8000,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO website_audit_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS website_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  normalized_url TEXT NOT NULL,
  project_id UUID REFERENCES project_management_projects(id) ON DELETE SET NULL,
  environment TEXT NOT NULL DEFAULT 'production',
  custom_environment TEXT,
  audit_scope TEXT NOT NULL DEFAULT 'website',
  selected_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_pages INTEGER NOT NULL DEFAULT 10,
  desktop_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  mobile_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  forms_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ai_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  overall_score INTEGER,
  category_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  pages_discovered INTEGER NOT NULL DEFAULT 0,
  pages_scanned INTEGER NOT NULL DEFAULT 0,
  failed_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  parent_audit_id UUID REFERENCES website_audits(id) ON DELETE SET NULL,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS website_audits_created_at_idx ON website_audits (created_at DESC);
CREATE INDEX IF NOT EXISTS website_audits_project_id_idx ON website_audits (project_id);
CREATE INDEX IF NOT EXISTS website_audits_status_idx ON website_audits (status);

CREATE TABLE IF NOT EXISTS website_audit_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES website_audits(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  normalized_url TEXT NOT NULL,
  page_title TEXT,
  http_status INTEGER,
  content_hash TEXT,
  page_type TEXT,
  scan_status TEXT NOT NULL DEFAULT 'queued',
  desktop_screenshot TEXT,
  mobile_screenshot TEXT,
  lighthouse_summary JSONB,
  accessibility_summary JSONB,
  typography_summary JSONB,
  layout_summary JSONB,
  console_error_count INTEGER NOT NULL DEFAULT 0,
  failed_request_count INTEGER NOT NULL DEFAULT 0,
  content_sample TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS website_audit_pages_audit_id_idx ON website_audit_pages (audit_id);

CREATE TABLE IF NOT EXISTS website_audit_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES website_audits(id) ON DELETE CASCADE,
  page_id UUID REFERENCES website_audit_pages(id) ON DELETE SET NULL,
  rule_code TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  recommendation TEXT,
  source TEXT NOT NULL DEFAULT 'SYSTEM',
  selector TEXT,
  viewport TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  fingerprint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  ticket_id UUID REFERENCES project_management_tickets(id) ON DELETE SET NULL,
  affected_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_confidence NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS website_audit_findings_audit_id_idx ON website_audit_findings (audit_id);
CREATE INDEX IF NOT EXISTS website_audit_findings_fingerprint_idx ON website_audit_findings (audit_id, fingerprint);
CREATE INDEX IF NOT EXISTS website_audit_findings_status_idx ON website_audit_findings (audit_id, status);

CREATE TABLE IF NOT EXISTS website_audit_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES website_audits(id) ON DELETE CASCADE,
  page_id UUID REFERENCES website_audit_pages(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  metric_value NUMERIC,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS website_audit_metrics_audit_id_idx ON website_audit_metrics (audit_id);

CREATE TABLE IF NOT EXISTS website_audit_ai_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES website_audits(id) ON DELETE CASCADE,
  page_id UUID REFERENCES website_audit_pages(id) ON DELETE SET NULL,
  viewport TEXT,
  prompt_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_json JSONB,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS website_audit_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_audit_id UUID NOT NULL REFERENCES website_audits(id) ON DELETE CASCADE,
  to_audit_id UUID NOT NULL REFERENCES website_audits(id) ON DELETE CASCADE,
  previous_score INTEGER,
  current_score INTEGER,
  difference INTEGER,
  fixed_count INTEGER NOT NULL DEFAULT 0,
  remaining_count INTEGER NOT NULL DEFAULT 0,
  new_count INTEGER NOT NULL DEFAULT 0,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS website_audit_ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  normalized_url TEXT NOT NULL,
  content_hash TEXT,
  screenshot_hash TEXT,
  engine_version TEXT NOT NULL,
  review_version TEXT NOT NULL,
  response_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS website_audit_ai_cache_key_idx ON website_audit_ai_cache (cache_key);

ALTER TABLE website_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_audit_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_audit_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_audit_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_audit_ai_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_audit_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_audit_ai_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_audit_settings ENABLE ROW LEVEL SECURITY;
