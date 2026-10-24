ALTER TABLE public.youtube_videos
  ADD COLUMN IF NOT EXISTS thumbnail_text TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_scene TEXT;
