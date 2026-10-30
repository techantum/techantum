-- Web Master Agent + standards knowledge base

ALTER TABLE website_audit_findings
  ADD COLUMN IF NOT EXISTS finding_type TEXT NOT NULL DEFAULT 'verified_issue',
  ADD COLUMN IF NOT EXISTS standard_reference JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS requires_manual_review BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suggested_ticket_type TEXT,
  ADD COLUMN IF NOT EXISTS original_ai_output JSONB,
  ADD COLUMN IF NOT EXISTS reviewer_id UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewer_reason TEXT,
  ADD COLUMN IF NOT EXISTS reviewer_severity TEXT,
  ADD COLUMN IF NOT EXISTS reviewer_recommendation TEXT;

ALTER TABLE website_audits
  ADD COLUMN IF NOT EXISTS webmaster_versions JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS webmaster_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_review_status TEXT NOT NULL DEFAULT 'skipped';

CREATE TABLE IF NOT EXISTS web_master_agent_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  agent_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ai_model TEXT,
  max_ai_pages INTEGER NOT NULL DEFAULT 5,
  confidence_threshold NUMERIC NOT NULL DEFAULT 0.6,
  content_character_limit INTEGER NOT NULL DEFAULT 2000,
  screenshot_resolution TEXT NOT NULL DEFAULT 'compressed',
  review_uiux BOOLEAN NOT NULL DEFAULT TRUE,
  review_content BOOLEAN NOT NULL DEFAULT TRUE,
  review_images BOOLEAN NOT NULL DEFAULT TRUE,
  review_seo_interpretation BOOLEAN NOT NULL DEFAULT TRUE,
  standards_version TEXT NOT NULL DEFAULT '1.0.0',
  techantum_standard_version TEXT NOT NULL DEFAULT '1.0',
  prompt_version TEXT NOT NULL DEFAULT '1.0.0',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO web_master_agent_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS web_standard_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'document',
  source_url TEXT,
  version TEXT,
  category TEXT NOT NULL,
  authority_level INTEGER NOT NULL DEFAULT 2,
  last_verified_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS web_standard_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES web_standard_sources(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  version TEXT,
  content TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS web_standard_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES web_standard_documents(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  rule_reference TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS web_standard_chunks_category_idx ON web_standard_chunks (category) WHERE active;

CREATE TABLE IF NOT EXISTS web_standard_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  description TEXT NOT NULL,
  authority_level INTEGER NOT NULL DEFAULT 3,
  severity_default TEXT NOT NULL DEFAULT 'medium',
  evaluation_type TEXT NOT NULL DEFAULT 'AI_REVIEW',
  source_id UUID REFERENCES web_standard_sources(id) ON DELETE SET NULL,
  source_reference TEXT,
  version TEXT NOT NULL DEFAULT '1.0',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS web_master_ai_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES website_audits(id) ON DELETE CASCADE,
  page_id UUID REFERENCES website_audit_pages(id) ON DELETE SET NULL,
  skill TEXT NOT NULL,
  cache_key TEXT,
  prompt_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_json JSONB,
  status TEXT NOT NULL DEFAULT 'completed',
  model_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS web_master_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id UUID NOT NULL REFERENCES website_audit_findings(id) ON DELETE CASCADE,
  audit_id UUID REFERENCES website_audits(id) ON DELETE SET NULL,
  original_ai_output JSONB,
  ai_confidence NUMERIC,
  reviewer_decision TEXT NOT NULL,
  corrected_severity TEXT,
  corrected_recommendation TEXT,
  reason TEXT,
  reviewer_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS web_master_versions (
  id TEXT PRIMARY KEY,
  agent_version TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  standards_version TEXT NOT NULL,
  techantum_standard_version TEXT NOT NULL,
  engine_version TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO web_master_versions (id, agent_version, prompt_version, standards_version, techantum_standard_version, engine_version, notes)
VALUES ('1.0.0', '1.0.0', '1.0.0', '1.0.0', '1.0', '1.0.0', 'Phase 1 Web Master Agent')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS web_master_evaluation_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  fixture_kind TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  expected JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS web_master_evaluation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_key TEXT NOT NULL,
  case_id UUID REFERENCES web_master_evaluation_cases(id) ON DELETE CASCADE,
  used_live_ai BOOLEAN NOT NULL DEFAULT FALSE,
  precision NUMERIC,
  recall NUMERIC,
  false_positives INTEGER,
  missed INTEGER,
  severity_agreement NUMERIC,
  average_confidence NUMERIC,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE web_master_agent_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_standard_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_standard_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_standard_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_standard_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_master_ai_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_master_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_master_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_master_evaluation_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_master_evaluation_results ENABLE ROW LEVEL SECURITY;
