import {
  getAnalyticsDateRange,
  parseGa4Credentials,
  type AnalyticsCustomDates,
  type AnalyticsRange,
  type Ga4Credentials,
} from '@/lib/analytics/ga4-config';

export type { AnalyticsCustomDates, AnalyticsRange };

export interface GbpConfig {
  locationId: string;
  location: string;
  accountId?: string;
  profileUrl?: string;
  credentials: Ga4Credentials;
}

/** Prefer dedicated GBP credentials; fall back to the existing GA4 service account. */
export function resolveGbpCredentials(): Ga4Credentials | null {
  const fromJson = parseGa4Credentials(process.env.GBP_SERVICE_ACCOUNT_JSON);
  if (fromJson) return fromJson;

  const clientEmail = process.env.GBP_CLIENT_EMAIL?.trim();
  let privateKey = process.env.GBP_PRIVATE_KEY?.trim();
  if (clientEmail && privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
    if (privateKey.includes('BEGIN PRIVATE KEY')) {
      return { client_email: clientEmail, private_key: privateKey };
    }
  }

  const ga4Json = parseGa4Credentials(process.env.GA4_SERVICE_ACCOUNT_JSON);
  if (ga4Json) return ga4Json;

  const ga4Email = process.env.GA4_CLIENT_EMAIL?.trim();
  let ga4Key = process.env.GA4_PRIVATE_KEY?.trim();
  if (ga4Email && ga4Key) {
    ga4Key = ga4Key.replace(/\\n/g, '\n');
    if (ga4Key.includes('BEGIN PRIVATE KEY')) {
      return { client_email: ga4Email, private_key: ga4Key };
    }
  }

  return null;
}

export function getGbpConfig(): GbpConfig | null {
  const locationId = process.env.GBP_LOCATION_ID?.trim();
  const credentials = resolveGbpCredentials();
  if (!locationId || !credentials) return null;

  const accountId = process.env.GBP_ACCOUNT_ID?.trim() || undefined;
  const profileUrl = process.env.GBP_PROFILE_URL?.trim() || undefined;

  return {
    locationId,
    location: locationId.startsWith('locations/') ? locationId : `locations/${locationId}`,
    accountId,
    profileUrl,
    credentials,
  };
}

export function isGbpConfigured(): boolean {
  return getGbpConfig() !== null;
}

export function getGbpDateRange(range: AnalyticsRange, custom?: AnalyticsCustomDates) {
  return getAnalyticsDateRange(range, custom);
}

/** Split YYYY-MM-DD into API date parts. */
export function toGbpDateParts(isoDate: string): { year: number; month: number; day: number } {
  const [year, month, day] = isoDate.split('-').map(Number);
  return { year, month, day };
}
