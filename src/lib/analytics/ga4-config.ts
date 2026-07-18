import type { AnalyticsRange } from './ga4-format';

export type { AnalyticsRange };
export { formatDuration, formatGa4Date } from './ga4-format';
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

export function getAnalyticsDateRange(range: AnalyticsRange) {
  const days = range === '7d' ? 7 : range === '28d' ? 28 : 90;

  // Match GA4 UI "Last N days": relative dates use the property timezone
  // (same as analytics.google.com date picker).
  const apiStartDate = `${days}daysAgo`;
  const apiEndDate = 'today';

  // Inclusive calendar window for display (today counts as day 1).
  const end = new Date();
  const start = new Date();
  start.setUTCDate(end.getUTCDate() - (days - 1));

  const labels: Record<AnalyticsRange, string> = {
    '7d': 'Last 7 days',
    '28d': 'Last 28 days',
    '90d': 'Last 90 days',
  };

  return {
    range,
    label: labels[range],
    /** Relative dates sent to GA4 Data API (property timezone). */
    apiStartDate,
    apiEndDate,
    /** Approximate UTC dates for UI labels only. */
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    days,
  };
}
