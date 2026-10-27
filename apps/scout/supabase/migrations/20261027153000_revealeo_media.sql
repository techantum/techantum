CREATE TABLE IF NOT EXISTS public.revealeo_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder TEXT NOT NULL DEFAULT 'cms',
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  bytes BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revealeo_media_created_at ON public.revealeo_media (created_at DESC);
