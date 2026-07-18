import { GoogleAuth } from 'google-auth-library';
import { getGa4Config, type Ga4Config } from './ga4-config';

const GA4_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const GA4_BASE = 'https://analyticsdata.googleapis.com/v1beta';

let cachedAuth: GoogleAuth | null = null;
let cachedConfigKey: string | null = null;
let cachedConfig: Ga4Config | null = null;

function getAuthBundle(): { auth: GoogleAuth; config: Ga4Config } | null {
  const config = getGa4Config();
  if (!config) return null;

  const configKey = `${config.propertyId}:${config.credentials.client_email}`;
  if (!cachedAuth || cachedConfigKey !== configKey) {
    cachedAuth = new GoogleAuth({
      credentials: config.credentials,
      scopes: [GA4_SCOPE],
    });
    cachedConfigKey = configKey;
    cachedConfig = config;
  }

  return { auth: cachedAuth, config: cachedConfig! };
}

export interface Ga4RunReportRequest {
  dateRanges: { startDate: string; endDate: string }[];
  dimensions?: { name: string }[];
  metrics: { name: string }[];
  orderBys?: Array<{
    dimension?: { dimensionName: string };
    metric?: { metricName: string };
    desc?: boolean;
  }>;
  limit?: number;
  keepEmptyRows?: boolean;
}

export interface Ga4RunReportResponse {
  rows?: Array<{
    dimensionValues?: Array<{ value?: string }>;
    metricValues?: Array<{ value?: string }>;
  }>;
}

/** Call GA4 Data API over plain HTTPS JSON — avoids protobuf int64 bugs in the gax client. */
export async function runGa4Report(
  request: Ga4RunReportRequest
): Promise<Ga4RunReportResponse> {
  const bundle = getAuthBundle();
  if (!bundle) {
    throw new Error(
      'GA4 is not configured. Set GA4_PROPERTY_ID and service account credentials (JSON or CLIENT_EMAIL + PRIVATE_KEY).'
    );
  }

  const client = await bundle.auth.getClient();
  const url = `${GA4_BASE}/${bundle.config.property}:runReport`;
  const res = await client.request<Ga4RunReportResponse>({
    url,
    method: 'POST',
    data: request,
    headers: { 'Content-Type': 'application/json' },
  });

  return res.data ?? {};
}

export function isGa4ClientConfigured(): boolean {
  return getAuthBundle() !== null;
}
