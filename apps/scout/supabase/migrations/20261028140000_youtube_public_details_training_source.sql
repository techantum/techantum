ALTER TABLE public.youtube_videos
  ADD COLUMN IF NOT EXISTS public_details JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.youtube_channels
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS public_details JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.youtube_ai_training
  ADD COLUMN IF NOT EXISTS source_name TEXT;
