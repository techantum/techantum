import { writeFinanceAudit } from './audit';
import { financeQuery, q, type DbClient } from './db';
import { FinanceNotFoundError } from './errors';

export type FinanceSettings = {
  id: number;
  company_name: string;
  registered_address: string | null;
  billing_address: string | null;
  gstin: string | null;
  pan: string | null;
  cin: string | null;
  state: string | null;
  state_code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_path: string | null;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  ifsc: string | null;
  branch: string | null;
  upi_id: string | null;
  payment_qr_path: string | null;
  signature_path: string | null;
  seal_path: string | null;
  default_terms: string | null;
  default_notes: string | null;
  invoice_number_prefix: string;
  invoice_number_separator: string;
  invoice_number_sequence_length: number;
  invoice_number_include_fy: boolean;
  invoice_number_fy_style: 'short' | 'full';
  show_logo: boolean;
  show_pan: boolean;
  show_client_gstin: boolean;
  show_sac: boolean;
  show_po: boolean;
  show_project: boolean;
  show_due_date: boolean;
  show_bank_details: boolean;
  show_qr: boolean;
  show_terms: boolean;
  show_notes: boolean;
  show_signature: boolean;
  show_seal: boolean;
  currency: string;
};

const BOOL_KEYS = [
  'show_logo',
  'show_pan',
  'show_client_gstin',
  'show_sac',
  'show_po',
  'show_project',
  'show_due_date',
  'show_bank_details',
  'show_qr',
  'show_terms',
  'show_notes',
  'show_signature',
  'show_seal',
  'invoice_number_include_fy',
] as const;

export async function getFinanceSettings(client?: DbClient): Promise<FinanceSettings> {
  const { rows } = await q<FinanceSettings>(client, 'SELECT * FROM finance_settings WHERE id = 1');
  if (!rows[0]) throw new FinanceNotFoundError('Finance settings are not initialized');
  return rows[0];
}

export async function updateFinanceSettings(
  patch: Record<string, unknown>,
  userId: string,
  meta?: { ip?: string | null; userAgent?: string | null }
) {
  const current = await getFinanceSettings();
  const allowed = [
    'company_name',
    'registered_address',
    'billing_address',
    'gstin',
    'pan',
    'cin',
    'state',
    'state_code',
    'phone',
    'email',
    'website',
    'logo_path',
    'bank_name',
    'account_name',
    'account_number',
    'ifsc',
    'branch',
    'upi_id',
    'payment_qr_path',
    'signature_path',
    'seal_path',
    'default_terms',
    'default_notes',
    'invoice_number_prefix',
    'invoice_number_separator',
    'invoice_number_sequence_length',
    'invoice_number_include_fy',
    'invoice_number_fy_style',
    'currency',
    ...BOOL_KEYS,
  ];
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const key of allowed) {
    if (!(key in patch)) continue;
    values.push(patch[key]);
    sets.push(`${key} = $${values.length}`);
  }
  if (!sets.length) return current;
  values.push(userId);
  sets.push(`updated_by = $${values.length}`);
  await financeQuery(`UPDATE finance_settings SET ${sets.join(', ')} WHERE id = 1`, values);
  const next = await getFinanceSettings();
  await writeFinanceAudit(undefined, {
    userId,
    action: 'Finance Settings Changed',
    entityType: 'finance_settings',
    entityId: null,
    previous: current,
    next,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  return next;
}
