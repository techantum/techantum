ALTER TABLE public.ai_knowledge_entries
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_file_url TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_knowledge_entries_source_type_check'
  ) THEN
    ALTER TABLE public.ai_knowledge_entries
      ADD CONSTRAINT ai_knowledge_entries_source_type_check
      CHECK (source_type IN ('MANUAL', 'URL', 'PDF'));
  END IF;
END $$;
