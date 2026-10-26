ALTER TABLE public.youtube_videos
  ADD COLUMN IF NOT EXISTS has_paid_product_placement BOOLEAN;
