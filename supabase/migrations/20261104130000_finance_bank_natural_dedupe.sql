-- Content-only natural uniqueness for bank statement lines (ignore import month)

CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_bank_lines_natural_unique
  ON public.finance_bank_statement_lines (
    txn_date,
    direction,
    amount,
    lower(btrim(description)),
    lower(btrim(COALESCE(reference, '')))
  )
  WHERE status = 'posted';
