import { GoogleAuth } from 'google-auth-library';
import { getGbpConfig, resolveGbpCredentials, type GbpConfig } from './config';

const GBP_SCOPE = 'https://www.googleapis.com/auth/business.manage';
const PERFORMANCE_BASE = 'https://businessprofileperformance.googleapis.com/v1';
const ACCOUNT_BASE = 'https://mybusinessaccountmanagement.googleapis.com/v1';
const INFO_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1';

let cachedAuth: GoogleAuth | null = null;
let cachedConfigKey: string | null = null;
let cachedConfig: GbpConfig | null = null;

function getAuthBundle(): { auth: GoogleAuth; config: GbpConfig } | null {
  const config = getGbpConfig();
  if (!config) return null;

  const configKey = `${config.location}:${config.credentials.client_email}`;
  if (!cachedAuth || cachedConfigKey !== configKey) {
    cachedAuth = new GoogleAuth({
      credentials: config.credentials,
      scopes: [GBP_SCOPE],
    });
    cachedConfigKey = configKey;
    cachedConfig = config;
  }

  return { auth: cachedAuth, config: cachedConfig! };
}

/** Auth for discovery helpers that only need credentials (no location ID yet). */
async function getCredentialClient() {
  const credentials = getGbpConfig()?.credentials ?? resolveGbpCredentials();
  if (!credentials) {
    throw new Error(
      'GBP credentials are not configured. Set GBP_SERVICE_ACCOUNT_JSON (or reuse GA4_SERVICE_ACCOUNT_JSON) and grant the service account Manager access on your Business Profile.'
    );
  }

  const auth = new GoogleAuth({
    credentials,
    scopes: [GBP_SCOPE],
  });
  return auth.getClient();
}

export type GbpDailyMetric =
  | 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS'
  | 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH'
  | 'BUSINESS_IMPRESSIONS_MOBILE_MAPS'
  | 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH'
  | 'BUSINESS_DIRECTION_REQUESTS'
  | 'CALL_CLICKS'
  | 'WEBSITE_CLICKS'
  | 'BUSINESS_CONVERSATIONS'
  | 'BUSINESS_BOOKINGS';

export const DEFAULT_GBP_METRICS: GbpDailyMetric[] = [
  'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
  'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
  'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
  'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
  'BUSINESS_DIRECTION_REQUESTS',
  'CALL_CLICKS',
  'WEBSITE_CLICKS',
  'BUSINESS_CONVERSATIONS',
];

export interface GbpDatedValue {
  date?: { year?: number; month?: number; day?: number };
  value?: string;
}

export interface GbpTimeSeries {
  datedValues?: GbpDatedValue[];
}

export interface GbpDailyMetricTimeSeries {
  dailyMetric?: string;
  timeSeries?: GbpTimeSeries;
}

export interface GbpMultiDailyMetricTimeSeries {
  dailyMetricTimeSeries?: GbpDailyMetricTimeSeries[];
}

export interface FetchMultiDailyMetricsResponse {
  multiDailyMetricTimeSeries?: GbpMultiDailyMetricTimeSeries[];
}

export async function fetchGbpMultiDailyMetrics(params: {
  startDate: string;
  endDate: string;
  metrics?: GbpDailyMetric[];
}): Promise<FetchMultiDailyMetricsResponse> {
  const bundle = getAuthBundle();
  if (!bundle) {
    throw new Error(
      'GBP is not configured. Set GBP_LOCATION_ID and service account credentials, then add the service account as a Manager on Google Business Profile.'
    );
  }

  const [sy, sm, sd] = params.startDate.split('-').map(Number);
  const [ey, em, ed] = params.endDate.split('-').map(Number);
  const metrics = params.metrics ?? DEFAULT_GBP_METRICS;

  const search = new URLSearchParams();
  for (const metric of metrics) {
    search.append('dailyMetrics', metric);
  }
  search.set('dailyRange.startDate.year', String(sy));
  search.set('dailyRange.startDate.month', String(sm));
  search.set('dailyRange.startDate.day', String(sd));
  search.set('dailyRange.endDate.year', String(ey));
  search.set('dailyRange.endDate.month', String(em));
  search.set('dailyRange.endDate.day', String(ed));

  const client = await bundle.auth.getClient();
  const url = `${PERFORMANCE_BASE}/${bundle.config.location}:fetchMultiDailyMetricsTimeSeries?${search.toString()}`;
  const res = await client.request<FetchMultiDailyMetricsResponse>({
    url,
    method: 'GET',
  });

  return res.data ?? {};
}

export interface GbpAccount {
  name: string;
  accountName?: string;
  type?: string;
}

export interface GbpLocationSummary {
  name: string;
  title?: string;
  storefrontAddress?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
  };
  metadata?: { mapsUri?: string; placeId?: string };
}

export async function listGbpAccounts(): Promise<GbpAccount[]> {
  const client = await getCredentialClient();
  const res = await client.request<{ accounts?: GbpAccount[] }>({
    url: `${ACCOUNT_BASE}/accounts`,
    method: 'GET',
  });
  return res.data?.accounts ?? [];
}

export async function listGbpLocations(accountName: string): Promise<GbpLocationSummary[]> {
  const client = await getCredentialClient();
  const parent = accountName.startsWith('accounts/') ? accountName : `accounts/${accountName}`;
  const res = await client.request<{ locations?: GbpLocationSummary[] }>({
    url: `${INFO_BASE}/${parent}/locations`,
    method: 'GET',
    params: {
      readMask: 'name,title,storefrontAddress,metadata',
      pageSize: 100,
    },
  });
  return res.data?.locations ?? [];
}

export function isGbpClientConfigured(): boolean {
  return getAuthBundle() !== null;
}
