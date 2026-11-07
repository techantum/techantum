-- Content-hash dedupe for bank statements; allow re-import of missing rows only.

ALTER TABLE public.finance_bank_statements
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

ALTER TABLE public.finance_bank_statements
  DROP CONSTRAINT IF EXISTS finance_bank_statements_statement_year_statement_month_orig_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_bank_statements_content_hash
  ON public.finance_bank_statements (statement_year, statement_month, content_hash)
  WHERE status <> 'cancelled' AND content_hash IS NOT NULL;
