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

export function getGa4Config(): Ga4Config | null {
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  const credentials = parseGa4Credentials(process.env.GA4_SERVICE_ACCOUNT_JSON);
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
  const end = new Date();
  const start = new Date();
  start.setUTCDate(end.getUTCDate() - days);

  const labels: Record<AnalyticsRange, string> = {
    '7d': 'Last 7 days',
    '28d': 'Last 28 days',
    '90d': 'Last 90 days',
  };

  return {
    range,
    label: labels[range],
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    days,
  };
}
