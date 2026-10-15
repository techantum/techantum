ALTER TABLE public.finance_settings ADD COLUMN IF NOT EXISTS payslip_logo_path TEXT;
ALTER TABLE public.finance_settings ADD COLUMN IF NOT EXISTS payslip_header_right TEXT;
ALTER TABLE public.finance_settings ADD COLUMN IF NOT EXISTS payslip_signatory_name TEXT;
ALTER TABLE public.finance_settings ADD COLUMN IF NOT EXISTS payslip_signatory_title TEXT;

UPDATE public.finance_settings
SET
  payslip_header_right = COALESCE(NULLIF(BTRIM(payslip_header_right), ''), E'Techantum Solutions\nA Unit of SJ Media Labs Pvt Ltd'),
  payslip_signatory_name = COALESCE(NULLIF(BTRIM(payslip_signatory_name), ''), 'Sudheer Uppuluri'),
  payslip_signatory_title = COALESCE(NULLIF(BTRIM(payslip_signatory_title), ''), 'HR Manager')
WHERE id = 1;
