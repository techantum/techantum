-- Multi-platform research projects (YouTube channel, Meta pages, LinkedIn company page).

ALTER TABLE public.youtube_research_projects
  ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'youtube';

UPDATE public.youtube_research_projects SET platform = 'youtube' WHERE platform IS NULL OR platform = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'youtube_projects_platform_chk'
  ) THEN
    ALTER TABLE public.youtube_research_projects
      ADD CONSTRAINT youtube_projects_platform_chk
      CHECK (platform IN ('youtube', 'facebook', 'instagram', 'linkedin'));
  END IF;
END $$;

ALTER TABLE public.youtube_channels
  ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'youtube';

UPDATE public.youtube_channels SET platform = 'youtube' WHERE platform IS NULL OR platform = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'youtube_channels_platform_chk'
  ) THEN
    ALTER TABLE public.youtube_channels
      ADD CONSTRAINT youtube_channels_platform_chk
      CHECK (platform IN ('youtube', 'facebook', 'instagram', 'linkedin'));
  END IF;
END $$;

ALTER TABLE public.youtube_channels DROP CONSTRAINT IF EXISTS youtube_channels_youtube_channel_id_key;
DROP INDEX IF EXISTS youtube_channels_youtube_channel_id_key;
DROP INDEX IF EXISTS public.youtube_channels_youtube_channel_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS youtube_channels_platform_external_uid
  ON public.youtube_channels (platform, youtube_channel_id);

CREATE INDEX IF NOT EXISTS idx_youtube_projects_platform
  ON public.youtube_research_projects (platform, status, updated_at DESC);
