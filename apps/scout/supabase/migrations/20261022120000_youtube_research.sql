-- YouTube competitor research. API-sourced columns are refreshed on demand and hidden after 30 days.
-- Administrator notes, topics, and captions live in separate columns and are not part of the YouTube payload.

CREATE TABLE IF NOT EXISTS public.youtube_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_channel_id TEXT NOT NULL UNIQUE,
  channel_name TEXT,
  channel_handle TEXT,
  channel_url TEXT,
  description TEXT,
  thumbnail_url TEXT,
  uploads_playlist_id TEXT,
  subscriber_count BIGINT,
  video_count BIGINT,
  view_count BIGINT,
  classification TEXT NOT NULL DEFAULT 'other',
  research_notes TEXT,
  last_refreshed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT youtube_channels_classification_chk CHECK (classification IN ('own', 'competitor', 'other')),
  CONSTRAINT youtube_channels_status_chk CHECK (status IN ('active', 'removed'))
);

CREATE INDEX IF NOT EXISTS idx_youtube_channels_status ON public.youtube_channels (status, channel_name);

CREATE TABLE IF NOT EXISTS public.youtube_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.youtube_channels(id) ON DELETE CASCADE,
  youtube_video_id TEXT NOT NULL UNIQUE,
  title TEXT,
  video_url TEXT,
  description TEXT,
  published_at TIMESTAMPTZ,
  duration TEXT,
  thumbnail_url TEXT,
  view_count BIGINT,
  like_count BIGINT,
  comment_count BIGINT,
  fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_youtube_videos_channel_published ON public.youtube_videos (channel_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_fetched ON public.youtube_videos (fetched_at);

CREATE TABLE IF NOT EXISTS public.youtube_research_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS youtube_topics_name_lower ON public.youtube_research_topics (lower(name));

CREATE TABLE IF NOT EXISTS public.youtube_video_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL UNIQUE REFERENCES public.youtube_videos(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.youtube_research_topics(id) ON DELETE SET NULL,
  thumbnail_caption TEXT,
  research_notes TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_youtube_video_research_topic ON public.youtube_video_research (topic_id);

CREATE TABLE IF NOT EXISTS public.youtube_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.youtube_channels(id) ON DELETE CASCADE,
  requested_by UUID,
  import_type TEXT NOT NULL,
  date_from DATE,
  date_to DATE,
  requested_limit INTEGER NOT NULL,
  processed_count INTEGER NOT NULL DEFAULT 0,
  inserted_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  error_summary TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT youtube_import_type_chk CHECK (import_type IN ('new', 'refresh', 'available')),
  CONSTRAINT youtube_import_status_chk CHECK (status IN ('pending', 'running', 'completed', 'partially_completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_youtube_import_jobs_channel ON public.youtube_import_jobs (channel_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.youtube_module_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  api_key_ciphertext TEXT,
  default_import_limit INTEGER NOT NULL DEFAULT 50,
  max_import_limit INTEGER NOT NULL DEFAULT 200,
  default_sort TEXT NOT NULL DEFAULT 'published_at',
  last_test_status TEXT,
  last_test_message TEXT,
  last_test_at TIMESTAMPTZ,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT youtube_settings_sort_chk CHECK (default_sort IN ('published_at', 'view_count', 'like_count', 'comment_count', 'title')),
  CONSTRAINT youtube_settings_limit_chk CHECK (default_import_limit BETWEEN 1 AND 500 AND max_import_limit BETWEEN 1 AND 500 AND default_import_limit <= max_import_limit)
);

INSERT INTO public.youtube_module_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.youtube_admin_grants (
  user_id UUID NOT NULL,
  permission TEXT NOT NULL,
  PRIMARY KEY (user_id, permission)
);

CREATE TABLE IF NOT EXISTS public.youtube_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_youtube_audit_created ON public.youtube_audit_logs (created_at DESC);

DROP TRIGGER IF EXISTS trg_youtube_channels_updated ON public.youtube_channels;
CREATE TRIGGER trg_youtube_channels_updated BEFORE UPDATE ON public.youtube_channels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_youtube_videos_updated ON public.youtube_videos;
CREATE TRIGGER trg_youtube_videos_updated BEFORE UPDATE ON public.youtube_videos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_youtube_topics_updated ON public.youtube_research_topics;
CREATE TRIGGER trg_youtube_topics_updated BEFORE UPDATE ON public.youtube_research_topics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_youtube_research_updated ON public.youtube_video_research;
CREATE TRIGGER trg_youtube_research_updated BEFORE UPDATE ON public.youtube_video_research
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
DECLARE
  tbl TEXT;
BEGIN
  IF to_regclass('public.admin_users') IS NULL THEN
    FOREACH tbl IN ARRAY ARRAY[
      'youtube_channels',
      'youtube_videos',
      'youtube_research_topics',
      'youtube_video_research',
      'youtube_import_jobs',
      'youtube_module_settings',
      'youtube_admin_grants',
      'youtube_audit_logs'
    ]
    LOOP
      EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', tbl);
    END LOOP;
  END IF;
END $$;
