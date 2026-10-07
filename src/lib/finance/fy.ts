import { FinanceValidationError } from './errors.ts';

export type DateRange = { from: string; to: string };

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function todayISO(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function assertISODate(value: string, label = 'Date'): string {
  const text = String(value || '').trim();
  if (!DATE_RE.test(text)) throw new FinanceValidationError(`${label} must be YYYY-MM-DD`);
  const date = new Date(`${text}T00:00:00`);
  if (Number.isNaN(date.getTime()) || todayISO(date) !== text) {
    throw new FinanceValidationError(`${label} is not a valid calendar date`);
  }
  return text;
}

export function financialYearFromDate(isoDate: string) {
  const date = assertISODate(isoDate, 'Date');
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;
  const yy = String(startYear).slice(-2);
  const ny = String(endYear).slice(-2);
  return {
    startYear,
    endYear,
    start: `${startYear}-04-01`,
    end: `${endYear}-03-31`,
    label: `${startYear}-${ny}`,
    shortLabel: `${yy}-${ny}`,
  };
}

export function formatFinancialYear(isoDate: string, style: 'short' | 'full' = 'full') {
  const fy = financialYearFromDate(isoDate);
  return style === 'short' ? fy.shortLabel : fy.label;
}

export function parseFinancialYear(label: string): DateRange & { label: string; shortLabel: string } {
  const text = String(label || '').trim();
  const full = text.match(/^(\d{4})-(\d{2})$/);
  const short = text.match(/^(\d{2})-(\d{2})$/);
  let startYear: number;
  let endYY: string;
  if (full) {
    startYear = Number(full[1]);
    endYY = full[2];
  } else if (short) {
    const century = Math.floor(new Date().getFullYear() / 100) * 100;
    startYear = century + Number(short[1]);
    if (startYear > new Date().getFullYear() + 1) startYear -= 100;
    endYY = short[2];
  } else {
    throw new FinanceValidationError('Financial year must look like 2026-27');
  }
  const expected = String(startYear + 1).slice(-2);
  if (endYY !== expected) {
    throw new FinanceValidationError(`Invalid financial year ${text}. Expected ${startYear}-${expected}`);
  }
  const fy = financialYearFromDate(`${startYear}-04-01`);
  return { from: fy.start, to: fy.end, start: fy.start, end: fy.end, label: fy.label, shortLabel: fy.shortLabel };
}

export function currentFinancialYear(now = new Date()) {
  return financialYearFromDate(todayISO(now));
}

export function monthRange(year: number, month: number): DateRange {
  if (month < 1 || month > 12) throw new FinanceValidationError('Month must be 1–12');
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const last = new Date(year, month, 0).getDate();
  return { from: start, to: `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}` };
}

export function previousMonthRange(now = new Date()): DateRange {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return monthRange(d.getFullYear(), d.getMonth() + 1);
}

export function currentMonthRange(now = new Date()): DateRange {
  return monthRange(now.getFullYear(), now.getMonth() + 1);
}

export function quarterRange(year: number, quarter: number): DateRange {
  if (quarter < 1 || quarter > 4) throw new FinanceValidationError('Quarter must be 1–4');
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  return { from: monthRange(year, startMonth).from, to: monthRange(year, endMonth).to };
}

export type PeriodFilter =
  | { kind: 'current_month' }
  | { kind: 'previous_month' }
  | { kind: 'financial_year'; fy?: string }
  | { kind: 'custom'; from: string; to: string }
  | { kind: 'month'; year: number; month: number }
  | { kind: 'quarter'; year: number; quarter: number };

export function resolvePeriod(filter: PeriodFilter, now = new Date()): DateRange & { label: string; fy: string } {
  let range: DateRange;
  let label: string;
  if (filter.kind === 'current_month') {
    range = currentMonthRange(now);
    label = 'Current Month';
  } else if (filter.kind === 'previous_month') {
    range = previousMonthRange(now);
    label = 'Previous Month';
  } else if (filter.kind === 'financial_year') {
    const fy = filter.fy ? parseFinancialYear(filter.fy) : currentFinancialYear(now);
    range = { from: fy.start ?? fy.from, to: fy.end ?? fy.to };
    label = fy.label;
  } else if (filter.kind === 'month') {
    range = monthRange(filter.year, filter.month);
    label = `${filter.year}-${String(filter.month).padStart(2, '0')}`;
  } else if (filter.kind === 'quarter') {
    range = quarterRange(filter.year, filter.quarter);
    label = `Q${filter.quarter} ${filter.year}`;
  } else {
    range = { from: assertISODate(filter.from, 'Start date'), to: assertISODate(filter.to, 'End date') };
    if (range.from > range.to) throw new FinanceValidationError('Start date must be on or before end date');
    label = `${range.from} to ${range.to}`;
  }
  const fy = financialYearFromDate(range.to);
  return { ...range, label, fy: fy.label };
}

export function assertDateInFinancialYear(isoDate: string, fyLabel: string) {
  const fy = parseFinancialYear(fyLabel);
  if (isoDate < fy.from || isoDate > fy.to) {
    throw new FinanceValidationError(`Date ${isoDate} is not in financial year ${fy.label}`);
  }
}
