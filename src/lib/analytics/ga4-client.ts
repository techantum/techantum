import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { getGa4Config, type Ga4Config } from './ga4-config';

let cachedClient: BetaAnalyticsDataClient | null = null;
let cachedConfigKey: string | null = null;

export function getGa4Client(): { client: BetaAnalyticsDataClient; config: Ga4Config } | null {
  const config = getGa4Config();
  if (!config) return null;

  const configKey = `${config.propertyId}:${config.credentials.client_email}`;
  if (!cachedClient || cachedConfigKey !== configKey) {
    cachedClient = new BetaAnalyticsDataClient({ credentials: config.credentials });
    cachedConfigKey = configKey;
  }

  return { client: cachedClient, config };
}
