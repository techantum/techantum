import { FinanceValidationError } from './errors.ts';

/** Integer paise. Never accumulate with IEEE floats. */

export function toCents(value: unknown): number {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new FinanceValidationError('Invalid money value');
    return Math.round(value * 100);
  }
  const text = String(value).trim().replace(/,/g, '');
  if (!text) return 0;
  if (!/^-?\d+(\.\d{1,4})?$/.test(text)) {
    throw new FinanceValidationError(`Invalid money value: ${text}`);
  }
  const negative = text.startsWith('-');
  const [rupees, frac = ''] = (negative ? text.slice(1) : text).split('.');
  const paise = (frac + '00').slice(0, 2);
  const extra = frac.slice(2);
  let cents = Number(rupees) * 100 + Number(paise);
  if (extra && Number(extra[0]) >= 5) cents += 1;
  return negative ? -cents : cents;
}

export function fromCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

export function centsToNumber(cents: number): number {
  return Math.round(cents) / 100;
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigitWords(n: number): string {
  if (n < 20) return ONES[n];
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return one ? `${TENS[ten]}-${ONES[one]}` : TENS[ten];
}

function threeDigitWords(n: number): string {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (rest) parts.push(twoDigitWords(rest));
  if (hundred && rest) return `${parts[0]} And ${parts[1]}`;
  return parts.join(' ');
}

function indianNumberWords(n: number): string {
  if (n === 0) return 'Zero';
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (crore) parts.push(`${threeDigitWords(crore)} Crore`);
  if (lakh) parts.push(`${twoDigitWords(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigitWords(thousand)} Thousand`);
  if (rest) parts.push(threeDigitWords(rest));
  return parts.join(', ');
}

export function rupeesInWords(cents: number): string {
  const sign = cents < 0 ? 'Minus ' : '';
  const abs = Math.abs(Math.round(cents));
  const rupees = Math.floor(abs / 100);
  const paise = abs % 100;
  const rupeeWords = `${indianNumberWords(rupees)} Rupee${rupees === 1 ? '' : 's'}`;
  if (!paise) return `${sign}${rupeeWords} Only`;
  return `${sign}${rupeeWords} And ${twoDigitWords(paise)} Paise Only`;
}

export function formatINR(cents: number, withSymbol = true): string {
  const formatted = centsToNumber(cents).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return withSymbol ? `₹${formatted}` : formatted;
}

export function parseQuantity(value: unknown): number {
  if (value == null || value === '') throw new FinanceValidationError('Quantity is required');
  const n = typeof value === 'number' ? value : Number(String(value).trim().replace(/,/g, ''));
  if (!Number.isFinite(n) || n <= 0) throw new FinanceValidationError('Quantity must be greater than 0');
  return Math.round(n * 1000) / 1000;
}

export function parseRate(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(String(value ?? '0').trim().replace(/,/g, ''));
  if (!Number.isFinite(n) || n < 0) throw new FinanceValidationError('Rate must be 0 or more');
  return n;
}

export function lineGrossCents(quantity: number, rate: unknown): number {
  return Math.round(quantity * toCents(rate));
}
