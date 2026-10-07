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
