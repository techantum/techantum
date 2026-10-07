-- Internal Finance Management (Phase 1). Operational finance, not a full ledger.
-- Reuses ops_clients / ops_projects. Salary entries use unique payroll_id for later HR sync.

ALTER TABLE public.ops_clients ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.ops_clients ADD COLUMN IF NOT EXISTS billing_address TEXT;
ALTER TABLE public.ops_clients ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.ops_clients ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.ops_clients ADD COLUMN IF NOT EXISTS state_code TEXT;
ALTER TABLE public.ops_clients ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.ops_clients ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE public.ops_clients ADD COLUMN IF NOT EXISTS gstin TEXT;
ALTER TABLE public.ops_clients ADD COLUMN IF NOT EXISTS pan TEXT;
ALTER TABLE public.ops_clients ADD COLUMN IF NOT EXISTS status TEXT;

UPDATE public.ops_clients SET country = COALESCE(NULLIF(country, ''), 'India');
UPDATE public.ops_clients SET status = COALESCE(NULLIF(status, ''), 'active');

CREATE TABLE IF NOT EXISTS public.finance_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  company_name TEXT NOT NULL DEFAULT 'Techantum',
  registered_address TEXT,
  billing_address TEXT,
  gstin TEXT,
  pan TEXT,
  cin TEXT,
  state TEXT,
  state_code TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_path TEXT,
  bank_name TEXT,
  account_name TEXT,
  account_number TEXT,
  ifsc TEXT,
  branch TEXT,
  upi_id TEXT,
  payment_qr_path TEXT,
  signature_path TEXT,
  seal_path TEXT,
  default_terms TEXT DEFAULT 'Payment is due by the stated due date. Please quote the invoice number on all payments.',
  default_notes TEXT,
  invoice_number_prefix TEXT NOT NULL DEFAULT 'TS',
  invoice_number_separator TEXT NOT NULL DEFAULT '/',
  invoice_number_sequence_length INTEGER NOT NULL DEFAULT 3,
  invoice_number_include_fy BOOLEAN NOT NULL DEFAULT TRUE,
  invoice_number_fy_style TEXT NOT NULL DEFAULT 'short',
  show_logo BOOLEAN NOT NULL DEFAULT TRUE,
  show_pan BOOLEAN NOT NULL DEFAULT TRUE,
  show_client_gstin BOOLEAN NOT NULL DEFAULT TRUE,
  show_sac BOOLEAN NOT NULL DEFAULT TRUE,
  show_po BOOLEAN NOT NULL DEFAULT TRUE,
  show_project BOOLEAN NOT NULL DEFAULT TRUE,
  show_due_date BOOLEAN NOT NULL DEFAULT TRUE,
  show_bank_details BOOLEAN NOT NULL DEFAULT TRUE,
  show_qr BOOLEAN NOT NULL DEFAULT TRUE,
  show_terms BOOLEAN NOT NULL DEFAULT TRUE,
  show_notes BOOLEAN NOT NULL DEFAULT TRUE,
  show_signature BOOLEAN NOT NULL DEFAULT TRUE,
  show_seal BOOLEAN NOT NULL DEFAULT TRUE,
  currency TEXT NOT NULL DEFAULT 'INR',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.finance_settings (id, company_name)
VALUES (1, 'Techantum')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.finance_invoice_sequences (
  prefix TEXT NOT NULL,
  financial_year TEXT NOT NULL,
  last_value INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (prefix, financial_year)
);

CREATE OR REPLACE FUNCTION public.finance_next_invoice_number(
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
  prefix TEXT := COALESCE(NULLIF(BTRIM(p_prefix), ''), 'TS');
  sep TEXT := COALESCE(p_separator, '/');
  fy TEXT := BTRIM(COALESCE(p_financial_year, ''));
  pad INTEGER := GREATEST(COALESCE(p_pad, 3), 1);
BEGIN
  IF fy = '' THEN
    RAISE EXCEPTION 'Financial year is required';
  END IF;
  INSERT INTO public.finance_invoice_sequences (prefix, financial_year, last_value)
  VALUES (prefix, fy, 1)
  ON CONFLICT (prefix, financial_year)
  DO UPDATE SET last_value = public.finance_invoice_sequences.last_value + 1
  RETURNING last_value INTO n;
  IF COALESCE(p_include_fy, TRUE) THEN
    RETURN prefix || sep || fy || sep || lpad(n::text, pad, '0');
  END IF;
  RETURN prefix || sep || lpad(n::text, pad, '0');
END;
$$;

CREATE TABLE IF NOT EXISTS public.finance_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  description TEXT,
  sac_hsn TEXT,
  default_rate NUMERIC(14,2) NOT NULL DEFAULT 0,
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18,
  unit TEXT DEFAULT 'Nos',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.finance_income_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name TEXT NOT NULL,
  category_code TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.finance_expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name TEXT NOT NULL,
  category_code TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.finance_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  state_code TEXT,
  gstin TEXT,
  pan TEXT,
  payment_details TEXT,
  default_expense_category_id UUID REFERENCES public.finance_expense_categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.finance_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE,
  invoice_date DATE NOT NULL,
  due_date DATE,
  financial_year TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES public.ops_clients(id),
  project_id UUID REFERENCES public.ops_projects(id) ON DELETE SET NULL,
  purchase_order_number TEXT,
  work_order_number TEXT,
  currency TEXT NOT NULL DEFAULT 'INR',
  place_of_supply TEXT,
  place_of_supply_state_code TEXT,
  tax_treatment TEXT NOT NULL DEFAULT 'auto',
  notes TEXT,
  terms TEXT,
  client_name TEXT,
  client_address TEXT,
  client_city TEXT,
  client_state TEXT,
  client_state_code TEXT,
  client_country TEXT,
  client_pincode TEXT,
  client_gstin TEXT,
  client_pan TEXT,
  client_email TEXT,
  client_phone TEXT,
  company_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  taxable_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  cgst NUMERIC(14,2) NOT NULL DEFAULT 0,
  sgst NUMERIC(14,2) NOT NULL DEFAULT 0,
  igst NUMERIC(14,2) NOT NULL DEFAULT 0,
  round_off NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_received NUMERIC(14,2) NOT NULL DEFAULT 0,
  tds_deducted NUMERIC(14,2) NOT NULL DEFAULT 0,
  other_deduction NUMERIC(14,2) NOT NULL DEFAULT 0,
  outstanding_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  invoice_status TEXT NOT NULL DEFAULT 'draft',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  pdf_path TEXT,
  cancelled_reason TEXT,
  cancelled_by UUID,
  cancelled_at TIMESTAMPTZ,
  finalized_by UUID,
  finalized_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT finance_invoices_status_chk CHECK (invoice_status IN ('draft', 'finalized', 'sent', 'cancelled')),
  CONSTRAINT finance_invoices_pay_chk CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid', 'overdue'))
);

CREATE TABLE IF NOT EXISTS public.finance_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.finance_invoices(id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL,
  service_id UUID REFERENCES public.finance_services(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  sac_hsn TEXT,
  quantity NUMERIC(12,3) NOT NULL,
  rate NUMERIC(14,2) NOT NULL,
  discount_percentage NUMERIC(7,3) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  taxable_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  cgst NUMERIC(14,2) NOT NULL DEFAULT 0,
  sgst NUMERIC(14,2) NOT NULL DEFAULT 0,
  igst NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.finance_invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.finance_invoices(id),
  client_id UUID NOT NULL REFERENCES public.ops_clients(id),
  payment_date DATE NOT NULL,
  amount_received NUMERIC(14,2) NOT NULL,
  tds_deducted NUMERIC(14,2) NOT NULL DEFAULT 0,
  other_deduction NUMERIC(14,2) NOT NULL DEFAULT 0,
  tds_type TEXT,
  tds_rate NUMERIC(7,3),
  tds_section TEXT,
  payment_mode TEXT,
  bank_account TEXT,
  transaction_reference TEXT,
  notes TEXT,
  attachment_path TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  payment_recorded_by UUID,
  cancelled_by UUID,
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT finance_pay_status_chk CHECK (status IN ('active', 'reversed')),
  CONSTRAINT finance_pay_amount_chk CHECK (amount_received > 0)
);

CREATE TABLE IF NOT EXISTS public.finance_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  income_date DATE NOT NULL,
  client_id UUID REFERENCES public.ops_clients(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  project_id UUID REFERENCES public.ops_projects(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.finance_income_categories(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.finance_invoices(id) ON DELETE SET NULL,
  payment_id UUID UNIQUE REFERENCES public.finance_invoice_payments(id) ON DELETE SET NULL,
  gross_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  gst_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tds_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_received NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_mode TEXT,
  bank_account TEXT,
  transaction_reference TEXT,
  description TEXT,
  attachment_path TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT finance_income_status_chk CHECK (status IN ('active', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS public.finance_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE NOT NULL,
  vendor_id UUID REFERENCES public.finance_vendors(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.finance_expense_categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  vendor_invoice_number TEXT,
  vendor_invoice_date DATE,
  taxable_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  cgst NUMERIC(14,2) NOT NULL DEFAULT 0,
  sgst NUMERIC(14,2) NOT NULL DEFAULT 0,
  igst NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tds_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tds_type TEXT,
  tds_rate NUMERIC(7,3),
  tds_section TEXT,
  amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  project_id UUID REFERENCES public.ops_projects(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.ops_clients(id) ON DELETE SET NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'recorded',
  salary_entry_id UUID,
  cancelled_reason TEXT,
  cancelled_by UUID,
  cancelled_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT finance_exp_status_chk CHECK (status IN ('recorded', 'cancelled')),
  CONSTRAINT finance_exp_pay_chk CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid'))
);

CREATE TABLE IF NOT EXISTS public.finance_expense_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.finance_expenses(id),
  payment_date DATE NOT NULL,
  amount_paid NUMERIC(14,2) NOT NULL,
  tds_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tds_type TEXT,
  tds_rate NUMERIC(7,3),
  tds_section TEXT,
  payment_mode TEXT,
  bank_account TEXT,
  transaction_reference TEXT,
  notes TEXT,
  attachment_path TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  payment_recorded_by UUID,
  cancelled_by UUID,
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT finance_exp_pay_status_chk CHECK (status IN ('active', 'reversed')),
  CONSTRAINT finance_exp_pay_amt_chk CHECK (amount_paid > 0)
);

CREATE TABLE IF NOT EXISTS public.finance_salary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_id TEXT UNIQUE,
  employee_id UUID,
  employee_name TEXT NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  gross_salary NUMERIC(14,2) NOT NULL DEFAULT 0,
  deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
  lop NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_salary NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_date DATE,
  payment_mode TEXT,
  transaction_reference TEXT,
  payslip_path TEXT,
  expense_id UUID REFERENCES public.finance_expenses(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'recorded',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'finance_expenses_salary_fk'
  ) THEN
    ALTER TABLE public.finance_expenses
      ADD CONSTRAINT finance_expenses_salary_fk
      FOREIGN KEY (salary_entry_id) REFERENCES public.finance_salary_entries(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date DATE NOT NULL,
  transaction_type TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  party_type TEXT,
  party_id UUID,
  category_id UUID,
  description TEXT,
  money_in NUMERIC(14,2) NOT NULL DEFAULT 0,
  money_out NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_mode TEXT,
  bank_account TEXT,
  transaction_reference TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT finance_txn_status_chk CHECK (status IN ('active', 'reversed'))
);

CREATE TABLE IF NOT EXISTS public.finance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  document_date DATE,
  financial_year TEXT,
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  notes TEXT,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.finance_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  previous_values JSONB,
  new_values JSONB,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_invoices_number ON public.finance_invoices (invoice_number);
CREATE INDEX IF NOT EXISTS idx_finance_invoices_date ON public.finance_invoices (invoice_date);
CREATE INDEX IF NOT EXISTS idx_finance_invoices_client ON public.finance_invoices (client_id);
CREATE INDEX IF NOT EXISTS idx_finance_invoices_project ON public.finance_invoices (project_id);
CREATE INDEX IF NOT EXISTS idx_finance_invoices_fy ON public.finance_invoices (financial_year);
CREATE INDEX IF NOT EXISTS idx_finance_invoices_status ON public.finance_invoices (invoice_status);
CREATE INDEX IF NOT EXISTS idx_finance_invoices_pay_status ON public.finance_invoices (payment_status);
CREATE INDEX IF NOT EXISTS idx_finance_items_invoice ON public.finance_invoice_items (invoice_id);
CREATE INDEX IF NOT EXISTS idx_finance_payments_invoice ON public.finance_invoice_payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_finance_payments_date ON public.finance_invoice_payments (payment_date);
CREATE INDEX IF NOT EXISTS idx_finance_payments_ref ON public.finance_invoice_payments (transaction_reference);
CREATE INDEX IF NOT EXISTS idx_finance_income_date ON public.finance_income (income_date);
CREATE INDEX IF NOT EXISTS idx_finance_income_client ON public.finance_income (client_id);
CREATE INDEX IF NOT EXISTS idx_finance_vendors_status ON public.finance_vendors (status);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_date ON public.finance_expenses (expense_date);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_vendor ON public.finance_expenses (vendor_id);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_cat ON public.finance_expenses (category_id);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_status ON public.finance_expenses (status);
CREATE INDEX IF NOT EXISTS idx_finance_exp_pay_expense ON public.finance_expense_payments (expense_id);
CREATE INDEX IF NOT EXISTS idx_finance_exp_pay_date ON public.finance_expense_payments (payment_date);
CREATE INDEX IF NOT EXISTS idx_finance_txn_date ON public.finance_transactions (transaction_date);
CREATE INDEX IF NOT EXISTS idx_finance_txn_type ON public.finance_transactions (transaction_type);
CREATE INDEX IF NOT EXISTS idx_finance_txn_ref ON public.finance_transactions (reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_finance_txn_xref ON public.finance_transactions (transaction_reference);
CREATE INDEX IF NOT EXISTS idx_finance_docs_type ON public.finance_documents (document_type);
CREATE INDEX IF NOT EXISTS idx_finance_docs_ref ON public.finance_documents (reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_finance_docs_fy ON public.finance_documents (financial_year);
CREATE INDEX IF NOT EXISTS idx_finance_audit_entity ON public.finance_audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ops_clients_gstin ON public.ops_clients (gstin);
CREATE INDEX IF NOT EXISTS idx_ops_clients_status ON public.ops_clients (status);

DROP TRIGGER IF EXISTS trg_finance_settings_updated ON public.finance_settings;
CREATE TRIGGER trg_finance_settings_updated BEFORE UPDATE ON public.finance_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_finance_invoices_updated ON public.finance_invoices;
CREATE TRIGGER trg_finance_invoices_updated BEFORE UPDATE ON public.finance_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_finance_vendors_updated ON public.finance_vendors;
CREATE TRIGGER trg_finance_vendors_updated BEFORE UPDATE ON public.finance_vendors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_finance_expenses_updated ON public.finance_expenses;
CREATE TRIGGER trg_finance_expenses_updated BEFORE UPDATE ON public.finance_expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.finance_income_categories (category_name, category_code) VALUES
  ('Project Revenue', 'project_revenue'),
  ('Hosting', 'hosting'),
  ('AMC', 'amc'),
  ('Consulting', 'consulting'),
  ('Other Income', 'other_income')
ON CONFLICT (category_code) DO NOTHING;

INSERT INTO public.finance_expense_categories (category_name, category_code) VALUES
  ('Employee Salaries', 'employee_salaries'),
  ('Freelancers', 'freelancers'),
  ('Software & Subscriptions', 'software_subscriptions'),
  ('Cloud / Hosting', 'cloud_hosting'),
  ('Domains', 'domains'),
  ('Internet / Telecom', 'internet_telecom'),
  ('Office Rent', 'office_rent'),
  ('Utilities', 'utilities'),
  ('Office Expenses', 'office_expenses'),
  ('Hardware', 'hardware'),
  ('Marketing & Advertising', 'marketing'),
  ('Travel', 'travel'),
  ('Food', 'food'),
  ('Professional Fees', 'professional_fees'),
  ('Bank Charges', 'bank_charges'),
  ('Taxes & Statutory Payments', 'taxes_statutory'),
  ('Vendor Payments', 'vendor_payments'),
  ('Recruitment', 'recruitment'),
  ('Training', 'training'),
  ('Miscellaneous', 'miscellaneous')
ON CONFLICT (category_code) DO NOTHING;

INSERT INTO public.finance_services (service_name, description, sac_hsn, default_rate, gst_rate, unit)
SELECT * FROM (VALUES
  ('Website Development', 'Website design and development', '998314', 0::numeric, 18::numeric, 'Nos'),
  ('Web Application Development', 'Custom web application development', '998314', 0::numeric, 18::numeric, 'Nos'),
  ('Mobile Application Development', 'Mobile application development', '998314', 0::numeric, 18::numeric, 'Nos'),
  ('UI/UX Design', 'User interface and experience design', '998314', 0::numeric, 18::numeric, 'Nos'),
  ('Hosting', 'Hosting and infrastructure', '998315', 0::numeric, 18::numeric, 'Nos'),
  ('AMC', 'Annual maintenance contract', '998314', 0::numeric, 18::numeric, 'Nos'),
  ('Consulting', 'Technology consulting', '998314', 0::numeric, 18::numeric, 'Nos'),
  ('Software Development', 'Custom software development', '998314', 0::numeric, 18::numeric, 'Nos'),
  ('WhatsApp API Services', 'WhatsApp Business API services', '998314', 0::numeric, 18::numeric, 'Nos')
) AS v(service_name, description, sac_hsn, default_rate, gst_rate, unit)
WHERE NOT EXISTS (SELECT 1 FROM public.finance_services s WHERE s.service_name = v.service_name);

ALTER TABLE public.finance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_invoice_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_income_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_expense_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_salary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'finance_settings',
    'finance_invoice_sequences',
    'finance_services',
    'finance_income_categories',
    'finance_expense_categories',
    'finance_vendors',
    'finance_invoices',
    'finance_invoice_items',
    'finance_invoice_payments',
    'finance_income',
    'finance_expenses',
    'finance_expense_payments',
    'finance_salary_entries',
    'finance_transactions',
    'finance_documents',
    'finance_audit_logs'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_admin ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I_admin ON public.%I FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))',
      tbl, tbl
    );
  END LOOP;
END $$;
