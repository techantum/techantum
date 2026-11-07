-- Bank statement imports → income, expenses, and Sridhar funding ledgers

CREATE TABLE IF NOT EXISTS public.finance_bank_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_month INTEGER NOT NULL CHECK (statement_month BETWEEN 1 AND 12),
  statement_year INTEGER NOT NULL CHECK (statement_year BETWEEN 2000 AND 2100),
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'posted'
    CHECK (status IN ('imported', 'posted', 'cancelled')),
  total_credits NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_debits NUMERIC(14,2) NOT NULL DEFAULT 0,
  income_count INTEGER NOT NULL DEFAULT 0,
  expense_count INTEGER NOT NULL DEFAULT 0,
  sridhar_count INTEGER NOT NULL DEFAULT 0,
  line_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  imported_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (statement_year, statement_month, original_filename)
);

CREATE TABLE IF NOT EXISTS public.finance_sridhar_funding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  txn_date DATE NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  description TEXT NOT NULL,
  reference TEXT,
  bank_account TEXT,
  category_label TEXT DEFAULT 'Sridhar Funding',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  statement_id UUID REFERENCES public.finance_bank_statements(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.finance_bank_statement_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID NOT NULL REFERENCES public.finance_bank_statements(id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL DEFAULT 0,
  txn_date DATE NOT NULL,
  description TEXT NOT NULL,
  reference TEXT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
  source_module TEXT NOT NULL CHECK (source_module IN ('income', 'expense', 'sridhar')),
  category_label TEXT,
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'skipped', 'duplicate')),
  fingerprint TEXT NOT NULL,
  income_id UUID REFERENCES public.finance_income(id) ON DELETE SET NULL,
  expense_id UUID REFERENCES public.finance_expenses(id) ON DELETE SET NULL,
  sridhar_id UUID REFERENCES public.finance_sridhar_funding(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES public.finance_transactions(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_finance_bank_statements_period
  ON public.finance_bank_statements (statement_year, statement_month);
CREATE INDEX IF NOT EXISTS idx_finance_bank_lines_statement
  ON public.finance_bank_statement_lines (statement_id);
CREATE INDEX IF NOT EXISTS idx_finance_bank_lines_date
  ON public.finance_bank_statement_lines (txn_date);
CREATE INDEX IF NOT EXISTS idx_finance_bank_lines_module
  ON public.finance_bank_statement_lines (source_module);
CREATE INDEX IF NOT EXISTS idx_finance_sridhar_date
  ON public.finance_sridhar_funding (txn_date);

ALTER TABLE public.finance_income
  ADD COLUMN IF NOT EXISTS bank_statement_line_id UUID REFERENCES public.finance_bank_statement_lines(id) ON DELETE SET NULL;
ALTER TABLE public.finance_expenses
  ADD COLUMN IF NOT EXISTS bank_statement_line_id UUID REFERENCES public.finance_bank_statement_lines(id) ON DELETE SET NULL;
ALTER TABLE public.finance_expenses
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

INSERT INTO public.finance_income_categories (category_name, category_code) VALUES
  ('Bank Credit', 'bank_credit'),
  ('Project Income', 'project_income'),
  ('Sridhar Funding', 'sridhar_funding_in')
ON CONFLICT (category_code) DO NOTHING;

INSERT INTO public.finance_expense_categories (category_name, category_code) VALUES
  ('Bank Debit', 'bank_debit'),
  ('IT & Tools', 'it_tools'),
  ('Sridhar Funding', 'sridhar_funding_out')
ON CONFLICT (category_code) DO NOTHING;

INSERT INTO public.finance_vendors (vendor_name, status, notes)
SELECT 'General / Other', 'active', 'System vendor for bank statement imports'
WHERE NOT EXISTS (SELECT 1 FROM public.finance_vendors WHERE vendor_name = 'General / Other');

ALTER TABLE public.finance_bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_bank_statement_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_sridhar_funding ENABLE ROW LEVEL SECURITY;
