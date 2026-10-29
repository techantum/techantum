CREATE TABLE IF NOT EXISTS public.youtube_meta_page_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_key TEXT NOT NULL,
  page_id TEXT NOT NULL,
  page_name TEXT,
  page_username TEXT,
  token_ciphertext TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT youtube_meta_page_tokens_owner_page UNIQUE (owner_key, page_id)
);

CREATE INDEX IF NOT EXISTS idx_youtube_meta_page_tokens_page ON public.youtube_meta_page_tokens (page_id);
