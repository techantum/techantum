import { ANALYTICS_RANGE_LABELS, type AnalyticsRange } from './ga4-format';

export type { AnalyticsRange };
export { formatDuration, formatGa4Date } from './ga4-format';

export type AnalyticsCustomDates = {
  from: string;
  to: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CUSTOM_DAYS = 366;

function utcToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function inclusiveDayCount(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000) + 1;
}

export function parseCustomDates(
  from: string | null,
  to: string | null
): { ok: true; from: string; to: string } | { ok: false; error: string } {
  if (!from || !to) {
    return { ok: false, error: 'Custom range requires From and To dates (YYYY-MM-DD).' };
  }
  if (!isValidIsoDate(from) || !isValidIsoDate(to)) {
    return { ok: false, error: 'Dates must be valid calendar days in YYYY-MM-DD format.' };
  }
  if (from > to) {
    return { ok: false, error: 'Start date must be on or before the end date.' };
  }
  if (inclusiveDayCount(from, to) > MAX_CUSTOM_DAYS) {
    return { ok: false, error: `Custom range cannot exceed ${MAX_CUSTOM_DAYS} days.` };
  }
  return { ok: true, from, to };
}

export interface Ga4Credentials {
  client_email: string;
  private_key: string;
  [key: string]: unknown;
}

export interface Ga4Config {
  propertyId: string;
  property: string;
  credentials: Ga4Credentials;
}

export function parseGa4Credentials(raw?: string | null): Ga4Credentials | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Ga4Credentials;
    if (!parsed.client_email || !parsed.private_key) return null;
    if (parsed.private_key.includes('\\n')) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Supports full JSON or separate email + private key env vars (no JSON file needed). */
export function resolveGa4Credentials(): Ga4Credentials | null {
  const fromJson = parseGa4Credentials(process.env.GA4_SERVICE_ACCOUNT_JSON);
  if (fromJson) return fromJson;

  const clientEmail = process.env.GA4_CLIENT_EMAIL?.trim();
  let privateKey = process.env.GA4_PRIVATE_KEY?.trim();
  if (!clientEmail || !privateKey) return null;

  privateKey = privateKey.replace(/\\n/g, '\n');
  if (!privateKey.includes('BEGIN PRIVATE KEY')) return null;

  return { client_email: clientEmail, private_key: privateKey };
}

export function getGa4Config(): Ga4Config | null {
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  const credentials = resolveGa4Credentials();
  if (!propertyId || !credentials) return null;

  return {
    propertyId,
    property: `properties/${propertyId}`,
    credentials,
  };
}

export function isGa4Configured(): boolean {
  return getGa4Config() !== null;
}

export function getAnalyticsDateRange(range: AnalyticsRange, custom?: AnalyticsCustomDates) {
  const today = utcToday();
  const todayIso = isoDate(today);

  let apiStartDate: string;
  let apiEndDate: string;
  let startDate: string;
  let endDate: string;
  let days: number;
  let label = ANALYTICS_RANGE_LABELS[range];

  switch (range) {
    case 'today':
      apiStartDate = 'today';
      apiEndDate = 'today';
      startDate = todayIso;
      endDate = todayIso;
      days = 1;
      break;
    case 'yesterday': {
      const yesterday = addUtcDays(today, -1);
      apiStartDate = 'yesterday';
      apiEndDate = 'yesterday';
      startDate = isoDate(yesterday);
      endDate = isoDate(yesterday);
      days = 1;
      break;
    }
    case '7d':
      apiStartDate = '7daysAgo';
      apiEndDate = 'today';
      startDate = isoDate(addUtcDays(today, -6));
      endDate = todayIso;
      days = 7;
      break;
    case 'week': {
      // Previous Monday–Sunday in UTC.
      const weekday = today.getUTCDay();
      const daysSinceLastSunday = weekday === 0 ? 7 : weekday;
      const lastSunday = addUtcDays(today, -daysSinceLastSunday);
      const lastMonday = addUtcDays(lastSunday, -6);
      startDate = isoDate(lastMonday);
      endDate = isoDate(lastSunday);
      apiStartDate = startDate;
      apiEndDate = endDate;
      days = 7;
      break;
    }
    case '28d':
      apiStartDate = '28daysAgo';
      apiEndDate = 'today';
      startDate = isoDate(addUtcDays(today, -27));
      endDate = todayIso;
      days = 28;
      break;
    case 'month': {
      const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
      const last = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
      startDate = isoDate(first);
      endDate = isoDate(last);
      apiStartDate = startDate;
      apiEndDate = endDate;
      days = last.getUTCDate();
      break;
    }
    case '90d':
      apiStartDate = '90daysAgo';
      apiEndDate = 'today';
      startDate = isoDate(addUtcDays(today, -89));
      endDate = todayIso;
      days = 90;
      break;
    case 'custom': {
      const parsed = custom ? parseCustomDates(custom.from, custom.to) : { ok: false as const };
      if (parsed.ok) {
        startDate = parsed.from;
        endDate = parsed.to;
        apiStartDate = parsed.from;
        apiEndDate = parsed.to;
        days = inclusiveDayCount(parsed.from, parsed.to);
        label = `${parsed.from} → ${parsed.to}`;
      } else {
        apiStartDate = '28daysAgo';
        apiEndDate = 'today';
        startDate = isoDate(addUtcDays(today, -27));
        endDate = todayIso;
        days = 28;
      }
      break;
    }
  }

  return {
    range,
    label,
    /** Relative or absolute dates sent to GA4 Data API (property timezone for relatives). */
    apiStartDate,
    apiEndDate,
    /** Approximate UTC dates for UI labels only. */
    startDate,
    endDate,
    days,
  };
}
