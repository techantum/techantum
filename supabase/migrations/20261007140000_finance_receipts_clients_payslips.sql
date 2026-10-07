-- Finance enhancement: receipts, client billing types, payslips.
-- Reuses finance_expenses as receipts. Does not drop finance_income (deprecated, unused by app).

ALTER TABLE public.ops_clients ADD COLUMN IF NOT EXISTS client_type TEXT;
ALTER TABLE public.ops_clients ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE public.ops_clients ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE public.ops_clients ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.ops_clients ADD COLUMN IF NOT EXISTS gst_registered BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.ops_clients ADD COLUMN IF NOT EXISTS legal_business_name TEXT;
ALTER TABLE public.ops_clients ADD COLUMN IF NOT EXISTS trade_name TEXT;
ALTER TABLE public.ops_clients ADD COLUMN IF NOT EXISTS tax_vat_number TEXT;
ALTER TABLE public.ops_clients ADD COLUMN IF NOT EXISTS business_registration_number TEXT;
ALTER TABLE public.ops_clients ADD COLUMN IF NOT EXISTS company_registration_number TEXT;
ALTER TABLE public.ops_clients ADD COLUMN IF NOT EXISTS default_currency TEXT NOT NULL DEFAULT 'INR';
ALTER TABLE public.ops_clients ADD COLUMN IF NOT EXISTS default_payment_terms TEXT;
ALTER TABLE public.ops_clients ADD COLUMN IF NOT EXISTS billing_notes TEXT;
ALTER TABLE public.ops_clients ADD COLUMN IF NOT EXISTS alternate_phone TEXT;
ALTER TABLE public.ops_clients ADD COLUMN IF NOT EXISTS website TEXT;

UPDATE public.ops_clients
SET website = COALESCE(NULLIF(website, ''), website_domain)
WHERE website IS NULL OR website = '';

UPDATE public.ops_clients
SET client_type = COALESCE(
  NULLIF(client_type, ''),
  CASE
    WHEN lower(COALESCE(country, 'India')) IN ('india', 'in') THEN 'indian_business'
    ELSE 'international_business'
  END
);

UPDATE public.ops_clients
SET gst_registered = TRUE
WHERE gst_registered = FALSE AND gstin IS NOT NULL AND BTRIM(gstin) <> '';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ops_clients_client_type_chk') THEN
    ALTER TABLE public.ops_clients
      ADD CONSTRAINT ops_clients_client_type_chk
      CHECK (client_type IN (
        'indian_business',
        'indian_individual',
        'international_business',
        'international_individual'
      ));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.finance_currencies (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 100
);

INSERT INTO public.finance_currencies (code, name, sort_order) VALUES
  ('INR', 'Indian Rupee', 1),
  ('USD', 'US Dollar', 2),
  ('EUR', 'Euro', 3),
  ('GBP', 'British Pound', 4),
  ('AED', 'UAE Dirham', 5),
  ('SGD', 'Singapore Dollar', 6),
  ('AUD', 'Australian Dollar', 7)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.finance_vendors (vendor_name, status, notes)
SELECT 'General / Other', 'active', 'System vendor for uncategorised receipts'
WHERE NOT EXISTS (SELECT 1 FROM public.finance_vendors WHERE vendor_name = 'General / Other');

ALTER TABLE public.finance_expenses ADD COLUMN IF NOT EXISTS receipt_number TEXT;
ALTER TABLE public.finance_expenses ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR';
ALTER TABLE public.finance_expenses ADD COLUMN IF NOT EXISTS other_tax NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.finance_expenses ADD COLUMN IF NOT EXISTS payment_mode TEXT;
ALTER TABLE public.finance_expenses ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE public.finance_expenses ADD COLUMN IF NOT EXISTS transaction_reference TEXT;
ALTER TABLE public.finance_expenses ADD COLUMN IF NOT EXISTS payment_date DATE;

UPDATE public.finance_expenses e
SET vendor_id = v.id
FROM public.finance_vendors v
WHERE e.vendor_id IS NULL AND v.vendor_name = 'General / Other';

CREATE TABLE IF NOT EXISTS public.finance_receipt_sequences (
  prefix TEXT NOT NULL,
  financial_year TEXT NOT NULL,
  last_value INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (prefix, financial_year)
);

CREATE OR REPLACE FUNCTION public.finance_next_receipt_number(
  p_prefix TEXT,
  p_financial_year TEXT,
  p_separator TEXT,
  p_pad INTEGER,
  p_include_fy BOOLEAN DEFAULT TRUE
) RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  n INTEGER;
  prefix TEXT := COALESCE(NULLIF(BTRIM(p_prefix), ''), 'RCP');
  sep TEXT := COALESCE(p_separator, '-');
  fy TEXT := BTRIM(COALESCE(p_financial_year, ''));
  pad INTEGER := GREATEST(COALESCE(p_pad, 3), 1);
BEGIN
  IF fy = '' THEN
    RAISE EXCEPTION 'Financial year is required';
  END IF;
  INSERT INTO public.finance_receipt_sequences (prefix, financial_year, last_value)
  VALUES (prefix, fy, 1)
  ON CONFLICT (prefix, financial_year)
  DO UPDATE SET last_value = public.finance_receipt_sequences.last_value + 1
  RETURNING last_value INTO n;
  IF COALESCE(p_include_fy, TRUE) THEN
    RETURN prefix || sep || fy || sep || lpad(n::text, pad, '0');
  END IF;
  RETURN prefix || sep || lpad(n::text, pad, '0');
END;
$$;

DO $$
DECLARE
  r RECORD;
  fy TEXT;
  num TEXT;
  start_year INTEGER;
BEGIN
  FOR r IN
    SELECT id, expense_date
    FROM public.finance_expenses
    WHERE receipt_number IS NULL
    ORDER BY expense_date, created_at
  LOOP
    start_year := CASE WHEN EXTRACT(MONTH FROM r.expense_date) >= 4
      THEN EXTRACT(YEAR FROM r.expense_date)::INTEGER
      ELSE EXTRACT(YEAR FROM r.expense_date)::INTEGER - 1
    END;
    fy := start_year::TEXT || '-' || right((start_year + 1)::TEXT, 2);
    SELECT public.finance_next_receipt_number('RCP', fy, '-', 3, TRUE) INTO num;
    UPDATE public.finance_expenses SET receipt_number = num WHERE id = r.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_expenses_receipt_number
  ON public.finance_expenses (receipt_number)
  WHERE receipt_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.finance_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT,
  user_id UUID,
  department TEXT,
  designation TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT finance_employees_status_chk CHECK (status IN ('active', 'inactive'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_employees_email
  ON public.finance_employees (lower(email))
  WHERE email IS NOT NULL AND BTRIM(email) <> '';

CREATE INDEX IF NOT EXISTS idx_finance_employees_user ON public.finance_employees (user_id);

CREATE TABLE IF NOT EXISTS public.finance_employee_payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.finance_employees(id) ON DELETE RESTRICT,
  payroll_month INTEGER NOT NULL CHECK (payroll_month BETWEEN 1 AND 12),
  payroll_year INTEGER NOT NULL,
  financial_year TEXT NOT NULL,
  payslip_date DATE,
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  remarks TEXT,
  previous_storage_path TEXT,
  previous_original_filename TEXT,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  replaced_by UUID,
  replaced_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT finance_payslips_unique UNIQUE (employee_id, payroll_month, payroll_year)
);

CREATE INDEX IF NOT EXISTS idx_finance_payslips_employee ON public.finance_employee_payslips (employee_id);
CREATE INDEX IF NOT EXISTS idx_finance_payslips_period ON public.finance_employee_payslips (payroll_year, payroll_month);
CREATE INDEX IF NOT EXISTS idx_ops_clients_client_type ON public.ops_clients (client_type);

DROP TRIGGER IF EXISTS trg_finance_employees_updated ON public.finance_employees;
CREATE TRIGGER trg_finance_employees_updated BEFORE UPDATE ON public.finance_employees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_finance_payslips_updated ON public.finance_employee_payslips;
CREATE TRIGGER trg_finance_payslips_updated BEFORE UPDATE ON public.finance_employee_payslips
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.finance_currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_receipt_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_employee_payslips ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'finance_currencies',
    'finance_receipt_sequences',
    'finance_employees',
    'finance_employee_payslips'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_admin ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I_admin ON public.%I FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))',
      tbl, tbl
    );
  END LOOP;
END $$;
