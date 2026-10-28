ALTER TABLE public.youtube_research_projects
  DROP CONSTRAINT IF EXISTS youtube_projects_status_chk;

UPDATE public.youtube_research_projects SET status = 'completed' WHERE status = 'archived';
UPDATE public.youtube_research_projects p
SET status = 'todo'
WHERE p.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.youtube_project_channels pc
    WHERE pc.project_id = p.id AND pc.relationship = 'own'
  );

ALTER TABLE public.youtube_research_projects
  ALTER COLUMN status SET DEFAULT 'todo';

ALTER TABLE public.youtube_research_projects
  ADD CONSTRAINT youtube_projects_status_chk CHECK (status IN ('todo', 'active', 'completed'));

CREATE TABLE IF NOT EXISTS public.youtube_ai_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'packaging',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_youtube_ai_training_enabled ON public.youtube_ai_training (enabled, updated_at DESC);

INSERT INTO public.youtube_ai_training (title, body, category, enabled)
SELECT * FROM (VALUES
  ('Package the click', 'Title and thumbnail must sell one promise. The first seconds of the video should deliver that same promise. Do not mix two topics on the packaging.', 'packaging', TRUE),
  ('Title standards', 'Use a specific, searchable title. Prefer clarity over cleverness. Keep the primary keyword near the front. Avoid ALL CAPS and clickbait that the video cannot fulfill.', 'titles', TRUE),
  ('Thumbnail standards', 'High contrast, one clear subject, few readable words (ideally 3 or fewer). Faces and emotion help. On-image text must match the title promise.', 'thumbnails', TRUE),
  ('Description and tags', 'First line restates the title promise. Add chapters when length allows. Tags should be relevant topical phrases, not stuffed repeats of the title.', 'seo', TRUE),
  ('Engagement loops', 'Ask for one public action that fits the content (comment prompt, like if useful). Pin a reply that continues the conversation. Do not invent retention or CTR claims from public counts.', 'engagement', TRUE),
  ('Competitive gaps', 'Compare own vs competitor packaging: title specificity, thumbnail word count, topic angle, and publish cadence. Recommend a concrete test the own channel can ship next.', 'gaps', TRUE)
) AS seed(title, body, category, enabled)
WHERE NOT EXISTS (SELECT 1 FROM public.youtube_ai_training LIMIT 1);
