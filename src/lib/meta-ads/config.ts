function env(key: string, fallback = '') {
  return process.env[key]?.trim() || fallback;
}

export type MetaAdsTokenSource = 'META_ADS_ACCESS_TOKEN' | 'META_SYSTEM_USER_ACCESS_TOKEN' | 'none';

export function getMetaAdsConfig() {
  const graphVersion = env('META_GRAPH_API_VERSION') || env('WHATSAPP_API_VERSION') || 'v21.0';
  const adsToken = env('META_ADS_ACCESS_TOKEN');
  const systemToken = env('META_SYSTEM_USER_ACCESS_TOKEN');
  const token = adsToken || systemToken;
  const tokenSource: MetaAdsTokenSource = adsToken
    ? 'META_ADS_ACCESS_TOKEN'
    : systemToken
      ? 'META_SYSTEM_USER_ACCESS_TOKEN'
      : 'none';

  const warnings: string[] = [];
  if (tokenSource === 'META_SYSTEM_USER_ACCESS_TOKEN') {
    warnings.push(
      'Using META_SYSTEM_USER_ACCESS_TOKEN. Confirm it was generated for the same Meta App you are submitting for review and includes ads_read.'
    );
  }
  if (tokenSource === 'none' && (env('META_WHATSAPP_ACCESS_TOKEN') || env('WHATSAPP_ACCESS_TOKEN'))) {
    warnings.push(
      'A WhatsApp access token is configured, but WhatsApp Graph calls do not count toward Marketing API Access Tier. Set META_ADS_ACCESS_TOKEN with ads_read.'
    );
  }

  const campaignInsightsLimit = Math.min(Math.max(Number(env('META_ADS_CAMPAIGN_INSIGHTS_LIMIT') || 40) || 40, 1), 80);

  return {
    graphVersion,
    graphBase: `https://graph.facebook.com/${graphVersion}`,
    appId: env('META_APP_ID') || env('NEXT_PUBLIC_META_APP_ID'),
    appSecret: env('META_APP_SECRET') || env('META_WHATSAPP_APP_SECRET') || env('WHATSAPP_APP_SECRET'),
    accessToken: token,
    tokenSource,
    configured: Boolean(token && graphVersion),
    adAccountId: parseOptionalActId(env('META_ADS_AD_ACCOUNT_ID')),
    campaignInsightsLimit,
    warnings,
  };
}

function parseOptionalActId(value: string) {
  const id = value.replace(/^act_/i, '').trim();
  return id || '';
}

export function publicMetaAdsStatus() {
  const cfg = getMetaAdsConfig();
  return {
    configured: cfg.configured,
    tokenSource: cfg.tokenSource,
    graphVersion: cfg.graphVersion,
    appId: cfg.appId || null,
    hasAdAccountOverride: Boolean(cfg.adAccountId),
    campaignInsightsLimit: cfg.campaignInsightsLimit,
    warnings: cfg.warnings,
  };
}
