function env(key: string, fallback = '') {
  return process.env[key]?.trim() || fallback;
}

export function getMetaProviderConfig() {
  const graphVersion = env('META_GRAPH_API_VERSION') || env('WHATSAPP_API_VERSION');
  return {
    graphVersion,
    graphBase: graphVersion ? `https://graph.facebook.com/${graphVersion}` : '',
    appId: env('META_APP_ID') || env('NEXT_PUBLIC_META_APP_ID'),
    publicAppId: env('NEXT_PUBLIC_META_APP_ID') || env('META_APP_ID'),
    appSecret: env('META_APP_SECRET') || env('META_WHATSAPP_APP_SECRET') || env('WHATSAPP_APP_SECRET'),
    embeddedSignupConfigId: env('META_EMBEDDED_SIGNUP_CONFIG_ID'),
    systemUserAccessToken: env('META_SYSTEM_USER_ACCESS_TOKEN') || env('META_WHATSAPP_ACCESS_TOKEN') || env('WHATSAPP_ACCESS_TOKEN'),
    businessId: env('META_BUSINESS_ID'),
    wabaId: env('META_WHATSAPP_BUSINESS_ACCOUNT_ID') || env('WHATSAPP_BUSINESS_ACCOUNT_ID'),
    phoneNumberId: env('META_WHATSAPP_PHONE_NUMBER_ID') || env('WHATSAPP_PHONE_NUMBER_ID'),
    webhookVerifyToken: env('META_WEBHOOK_VERIFY_TOKEN') || env('META_WHATSAPP_VERIFY_TOKEN') || env('WHATSAPP_VERIFY_TOKEN'),
    webhookCallbackUrl: env('META_WEBHOOK_CALLBACK_URL'),
    creditLineId: env('META_CREDIT_LINE_ID'),
    creditSharingEnabled: env('FEATURE_META_CREDIT_SHARING') === 'true',
    seedDemo: env('WA_PROVIDER_SEED_DEMO') === 'true',
  };
}

export function getPublicMetaSignupConfig() {
  const cfg = getMetaProviderConfig();
  return {
    appId: cfg.publicAppId,
    configId: cfg.embeddedSignupConfigId,
    graphVersion: cfg.graphVersion,
    configured: Boolean(cfg.publicAppId && cfg.graphVersion),
    existingConfigured: Boolean(cfg.systemUserAccessToken && cfg.wabaId && cfg.phoneNumberId),
  };
}

export const META_PERMISSIONS = [
  { permission: 'whatsapp_business_management', requiredFor: 'WABA, templates, phone numbers, subscriptions' },
  { permission: 'whatsapp_business_messaging', requiredFor: 'Sending messages and reading message webhooks' },
  { permission: 'business_management', requiredFor: 'Business portfolio and assigned users' },
] as const;

export const ONBOARDING_STEPS = [
  'Create Client',
  'Client Details',
  'Connect Meta',
  'Select/Create Business Portfolio',
  'Select/Create WABA',
  'Add / Select WhatsApp Phone Number',
  'Verify Number',
  'Register Number',
  'Link WABA',
  'Subscribe Webhooks',
  'Sync Templates',
  'Test Connection',
  'Complete',
] as const;
