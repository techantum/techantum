import { FinanceValidationError } from './errors.ts';
import { toCents } from './money.ts';

export const GST_RATES = [0, 5, 12, 18, 28] as const;

export const BILLING_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD'] as const;
export type GstRate = (typeof GST_RATES)[number];
export type TaxTreatment = 'auto' | 'cgst_sgst' | 'igst' | 'none';

export const INDIAN_STATES: { code: string; name: string }[] = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
];

export function normalizeStateCode(value: string | null | undefined): string {
  const text = String(value || '').trim();
  if (!text) return '';
  const byName = INDIAN_STATES.find((s) => s.name.toLowerCase() === text.toLowerCase());
  if (byName) return byName.code;
  if (/^\d{1,2}$/.test(text)) return text.padStart(2, '0');
  return text;
}

export function stateName(code: string | null | undefined): string {
  const normalized = normalizeStateCode(code);
  return INDIAN_STATES.find((s) => s.code === normalized)?.name || String(code || '');
}

export function parseGstRate(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  if (!GST_RATES.includes(n as GstRate)) {
    throw new FinanceValidationError('GST rate must be 0, 5, 12, 18 or 28');
  }
  return n;
}

export function isIntraState(supplierStateCode: string, placeOfSupplyStateCode: string): boolean {
  const a = normalizeStateCode(supplierStateCode);
  const b = normalizeStateCode(placeOfSupplyStateCode);
  return Boolean(a && b && a === b);
}

export function resolveTaxSplit(
  treatment: TaxTreatment,
  supplierStateCode: string,
  placeOfSupplyStateCode: string
): 'cgst_sgst' | 'igst' | 'none' {
  if (treatment === 'none' || treatment === 'cgst_sgst' || treatment === 'igst') return treatment;
  return isIntraState(supplierStateCode, placeOfSupplyStateCode) ? 'cgst_sgst' : 'igst';
}

export function taxOn(taxableCents: number, gstRate: number, split: 'cgst_sgst' | 'igst' | 'none') {
  const tax = Math.round((taxableCents * toCents(gstRate)) / 10000);
  if (split === 'none' || gstRate === 0) {
    return { cgst: 0, sgst: 0, igst: 0, tax: 0 };
  }
  if (split === 'igst') {
    return { cgst: 0, sgst: 0, igst: tax, tax };
  }
  const cgst = Math.floor(tax / 2);
  const sgst = tax - cgst;
  return { cgst, sgst, igst: 0, tax };
}
