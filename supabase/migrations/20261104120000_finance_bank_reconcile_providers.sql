-- Bank statement reconciliation + service provider (counterparty) fields

ALTER TABLE public.finance_bank_statement_lines
  ADD COLUMN IF NOT EXISTS party_type TEXT
    CHECK (party_type IS NULL OR party_type IN ('client', 'vendor', 'employee')),
  ADD COLUMN IF NOT EXISTS party_id UUID,
  ADD COLUMN IF NOT EXISTS party_name TEXT,
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.finance_services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS matched_invoice_id UUID REFERENCES public.finance_invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS matched_payment_id UUID REFERENCES public.finance_invoice_payments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS matched_receipt_id UUID REFERENCES public.finance_expenses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reconcile_key TEXT;

CREATE INDEX IF NOT EXISTS idx_finance_bank_lines_party_name
  ON public.finance_bank_statement_lines (party_name);
CREATE INDEX IF NOT EXISTS idx_finance_bank_lines_party_id
  ON public.finance_bank_statement_lines (party_id);
CREATE INDEX IF NOT EXISTS idx_finance_bank_lines_service
  ON public.finance_bank_statement_lines (service_id);
CREATE INDEX IF NOT EXISTS idx_finance_bank_lines_reconcile_key
  ON public.finance_bank_statement_lines (reconcile_key);

ALTER TABLE public.finance_invoice_payments
  ADD COLUMN IF NOT EXISTS bank_statement_line_id UUID
    REFERENCES public.finance_bank_statement_lines(id) ON DELETE SET NULL;

ALTER TABLE public.finance_expense_payments
  ADD COLUMN IF NOT EXISTS bank_statement_line_id UUID
    REFERENCES public.finance_bank_statement_lines(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_finance_invoice_payments_bank_line
  ON public.finance_invoice_payments (bank_statement_line_id);
CREATE INDEX IF NOT EXISTS idx_finance_expense_payments_bank_line
  ON public.finance_expense_payments (bank_statement_line_id);
