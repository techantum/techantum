-- Project-scoped YouTube research. Existing channel, video, and note rows are kept.

CREATE TABLE IF NOT EXISTS public.youtube_research_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand_name TEXT,
  objective TEXT,
  industry TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  legacy BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT youtube_projects_status_chk CHECK (status IN ('active', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_youtube_projects_status ON public.youtube_research_projects (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.youtube_project_channels (
  project_id UUID NOT NULL REFERENCES public.youtube_research_projects(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.youtube_channels(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, channel_id),
  CONSTRAINT youtube_project_relationship_chk CHECK (relationship IN ('own', 'competitor'))
);

CREATE UNIQUE INDEX IF NOT EXISTS youtube_project_one_own
  ON public.youtube_project_channels (project_id)
  WHERE relationship = 'own';

CREATE TABLE IF NOT EXISTS public.youtube_project_video_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.youtube_research_projects(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.youtube_videos(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.youtube_research_topics(id) ON DELETE SET NULL,
  thumbnail_caption TEXT,
  research_notes TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_youtube_project_research_topic ON public.youtube_project_video_research (project_id, topic_id);

ALTER TABLE public.youtube_research_topics ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.youtube_research_projects(id) ON DELETE CASCADE;
ALTER TABLE public.youtube_videos ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.youtube_videos ADD COLUMN IF NOT EXISTS category_id TEXT;
ALTER TABLE public.youtube_videos ADD COLUMN IF NOT EXISTS default_language TEXT;
ALTER TABLE public.youtube_videos ADD COLUMN IF NOT EXISTS default_audio_language TEXT;
ALTER TABLE public.youtube_videos ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE public.youtube_channels ADD COLUMN IF NOT EXISTS channel_published_at TIMESTAMPTZ;
ALTER TABLE public.youtube_import_jobs ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.youtube_research_projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_youtube_videos_tags ON public.youtube_videos USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_youtube_topics_project ON public.youtube_research_topics (project_id, name);

INSERT INTO public.youtube_research_projects (id, name, description, status, legacy)
SELECT 'a0000000-0000-4000-8000-000000000001', 'Existing research', 'Channels, videos, and notes saved before research projects were added.', 'active', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.youtube_research_projects WHERE id = 'a0000000-0000-4000-8000-000000000001')
  AND (
    EXISTS (SELECT 1 FROM public.youtube_channels)
    OR EXISTS (SELECT 1 FROM public.youtube_videos)
    OR EXISTS (SELECT 1 FROM public.youtube_video_research)
    OR EXISTS (SELECT 1 FROM public.youtube_research_topics)
  );

INSERT INTO public.youtube_project_channels (project_id, channel_id, relationship)
SELECT 'a0000000-0000-4000-8000-000000000001', c.id,
  CASE WHEN c.id = (
    SELECT id FROM public.youtube_channels
    WHERE classification = 'own' AND status = 'active'
    ORDER BY created_at
    LIMIT 1
  ) THEN 'own' ELSE 'competitor' END
FROM public.youtube_channels c
WHERE EXISTS (SELECT 1 FROM public.youtube_research_projects WHERE id = 'a0000000-0000-4000-8000-000000000001')
ON CONFLICT (project_id, channel_id) DO NOTHING;

UPDATE public.youtube_research_topics
SET project_id = 'a0000000-0000-4000-8000-000000000001'
WHERE project_id IS NULL
  AND EXISTS (SELECT 1 FROM public.youtube_research_projects WHERE id = 'a0000000-0000-4000-8000-000000000001');

INSERT INTO public.youtube_project_video_research (project_id, video_id, topic_id, thumbnail_caption, research_notes, updated_by)
SELECT 'a0000000-0000-4000-8000-000000000001', video_id, topic_id, thumbnail_caption, research_notes, updated_by
FROM public.youtube_video_research
WHERE EXISTS (SELECT 1 FROM public.youtube_research_projects WHERE id = 'a0000000-0000-4000-8000-000000000001')
ON CONFLICT (project_id, video_id) DO NOTHING;

DROP INDEX IF EXISTS public.youtube_topics_name_lower;
CREATE UNIQUE INDEX IF NOT EXISTS youtube_topics_project_name_lower
  ON public.youtube_research_topics (project_id, lower(name));

DROP TRIGGER IF EXISTS trg_youtube_projects_updated ON public.youtube_research_projects;
CREATE TRIGGER trg_youtube_projects_updated BEFORE UPDATE ON public.youtube_research_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_youtube_project_research_updated ON public.youtube_project_video_research;
CREATE TRIGGER trg_youtube_project_research_updated BEFORE UPDATE ON public.youtube_project_video_research
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
DECLARE
  tbl TEXT;
BEGIN
  IF to_regclass('public.admin_users') IS NULL THEN
    FOREACH tbl IN ARRAY ARRAY['youtube_research_projects', 'youtube_project_channels', 'youtube_project_video_research']
    LOOP
      EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', tbl);
    END LOOP;
  END IF;
END $$;
