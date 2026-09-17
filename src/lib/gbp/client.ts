import { GoogleAuth } from 'google-auth-library';
import { getGbpConfig, resolveGbpCredentials, type GbpConfig } from './config';
import { getGbpOAuthRequestClient, getGbpOAuthStatus } from './oauth';

export const GBP_SCOPE = 'https://www.googleapis.com/auth/business.manage';
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

async function getServiceAccountClient() {
  const credentials = getGbpConfig()?.credentials ?? resolveGbpCredentials();
  if (!credentials) return null;
  const auth = new GoogleAuth({
    credentials,
    scopes: [GBP_SCOPE],
  });
  return auth.getClient();
}

async function getGbpRequestClient() {
  const oauthClient = await getGbpOAuthRequestClient();
  if (oauthClient) return oauthClient;

  const saClient = await getServiceAccountClient();
  if (saClient) return saClient;

  throw new Error(
    'GBP is not connected. Click Connect Owner Google login and sign in with an Owner/Manager Google account for Techantum Solutions.'
  );
}

async function getGbpLocationResource() {
  const oauth = await getGbpOAuthStatus();
  const locationId = oauth.locationId?.trim();
  if (!locationId) {
    throw new Error('GBP location is not selected. Connect Owner Google login, then Discover locations.');
  }
  return locationId.startsWith('locations/') ? locationId : `locations/${locationId}`;
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
  const location = await getGbpLocationResource();
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

  const client = await getGbpRequestClient();
  const url = `${PERFORMANCE_BASE}/${location}:fetchMultiDailyMetricsTimeSeries?${search.toString()}`;
  try {
    const res = await client.request<FetchMultiDailyMetricsResponse>({
      url,
      method: 'GET',
    });
    return res.data ?? {};
  } catch (error) {
    throw new Error(gbpApiErrorText(error));
  }
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
  const client = await getGbpRequestClient();
  const res = await client.request<{ accounts?: GbpAccount[] }>({
    url: `${ACCOUNT_BASE}/accounts`,
    method: 'GET',
  });
  return res.data?.accounts ?? [];
}

export async function listGbpLocations(accountName: string): Promise<GbpLocationSummary[]> {
  const client = await getGbpRequestClient();
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

export interface GbpInvitation {
  name: string;
  role?: string;
  locationName?: string;
  placeId?: string;
}

export async function listGbpInvitations(accountName: string): Promise<GbpInvitation[]> {
  const client = await getGbpRequestClient();
  const parent = accountName.startsWith('accounts/') ? accountName : `accounts/${accountName}`;
  const res = await client.request<{
    invitations?: Array<{
      name: string;
      role?: string;
      targetLocation?: { locationName?: string; placeId?: string };
    }>;
  }>({
    url: `${ACCOUNT_BASE}/${parent}/invitations`,
    method: 'GET',
  });

  return (res.data?.invitations ?? []).map((invite) => ({
    name: invite.name,
    role: invite.role,
    locationName: invite.targetLocation?.locationName,
    placeId: invite.targetLocation?.placeId,
  }));
}

export async function acceptGbpInvitation(invitationName: string): Promise<void> {
  const client = await getGbpRequestClient();
  await client.request({
    url: `${ACCOUNT_BASE}/${invitationName}:accept`,
    method: 'POST',
    data: {},
  });
}

function gbpApiErrorText(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return error instanceof Error ? error.message : String(error);
  }
  const err = error as {
    message?: string;
    response?: { status?: number; data?: { error?: { status?: string; message?: string } } };
  };
  const status = err.response?.status;
  const gstatus = err.response?.data?.error?.status;
  const gmsg = err.response?.data?.error?.message || err.message || 'GBP API error';
  return `GBP API ${status ?? ''} ${gstatus ?? ''}: ${gmsg}`.replace(/\s+/g, ' ').trim();
}

export interface DiscoveredGbpLocation {
  accountName: string;
  accountDisplayName: string;
  locationName: string;
  locationId: string;
  title: string;
  address: string;
  mapsUri: string | null;
  placeId: string | null;
}

export async function discoverGbpLocationCatalog(): Promise<{
  accounts: GbpAccount[];
  locations: DiscoveredGbpLocation[];
  invitations: GbpInvitation[];
  inviteAcceptError?: string;
  pendingInviteBlocked?: boolean;
}> {
  const oauth = await getGbpOAuthStatus();
  const accounts = await listGbpAccounts();
  const invitations: GbpInvitation[] = [];
  let inviteAcceptError: string | undefined;
  let pendingInviteBlocked = false;

  if (!oauth.hasRefreshToken) {
    for (const account of accounts) {
      const pending = await listGbpInvitations(account.name);
      invitations.push(...pending);
      for (const invite of pending) {
        try {
          await acceptGbpInvitation(invite.name);
        } catch (error) {
          inviteAcceptError = gbpApiErrorText(error);
          pendingInviteBlocked = true;
        }
      }
    }
  }

  const refreshedAccounts = await listGbpAccounts();
  const locations: DiscoveredGbpLocation[] = [];

  for (const account of refreshedAccounts) {
    const rows = await listGbpLocations(account.name);
    for (const loc of rows) {
      const locationId = loc.name?.split('/').pop() ?? loc.name;
      locations.push({
        accountName: account.name,
        accountDisplayName: account.accountName ?? account.name,
        locationName: loc.name,
        locationId,
        title: loc.title ?? 'Untitled location',
        address: [
          ...(loc.storefrontAddress?.addressLines ?? []),
          loc.storefrontAddress?.locality,
          loc.storefrontAddress?.administrativeArea,
          loc.storefrontAddress?.postalCode,
        ]
          .filter(Boolean)
          .join(', '),
        mapsUri: loc.metadata?.mapsUri ?? null,
        placeId: loc.metadata?.placeId ?? null,
      });
    }
  }

  return {
    accounts: refreshedAccounts,
    locations,
    invitations,
    inviteAcceptError,
    pendingInviteBlocked,
  };
}

export function pendingGbpInviteMessage(invitations: GbpInvitation[], inviteAcceptError?: string): string {
  const listing =
    invitations.map((invite) => invite.locationName).filter(Boolean).join(', ') ||
    'Techantum Solutions';
  return [
    `API quota is already approved (300 requests/minute). A Manager invite for ${listing} is pending.`,
    'Google blocked accepting it onto this service account because its Business Profile identity is PERSONAL/unverified.',
    'In business.google.com, open the location group (not only the single listing) → Manage users / People and access, and invite the service account there as Manager.',
    'Then click Discover locations again.',
    'If you do not have a location group, connect GBP with an Owner Google login instead of the service account.',
    inviteAcceptError ? `Google error: ${inviteAcceptError}` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function gbpServiceEmail(): string | undefined {
  return (
    getGbpConfig()?.credentials.client_email ||
    resolveGbpCredentials()?.client_email ||
    process.env.GBP_CLIENT_EMAIL?.trim() ||
    process.env.GA4_CLIENT_EMAIL?.trim()
  );
}

export function isGbpClientConfigured(): boolean {
  return getAuthBundle() !== null;
}
