import { metaHostedEmbeddedSignupUrl, zeroIntegrationOnboardingUrl } from '@/lib/auth/public-origin';

function env(key: string, fallback = '') {
  return process.env[key]?.trim() || fallback;
}

export const DEFAULT_META_APP_ID = '27686807767646135';
export const DEFAULT_EMBEDDED_SIGNUP_CONFIG_ID = '1102324422268818';

export function getMetaProviderConfig() {
  const graphVersion = env('META_GRAPH_API_VERSION') || env('WHATSAPP_API_VERSION');
  const appId = env('META_APP_ID') || env('NEXT_PUBLIC_META_APP_ID') || DEFAULT_META_APP_ID;
  return {
    graphVersion,
    graphBase: graphVersion ? `https://graph.facebook.com/${graphVersion}` : '',
    appId,
    publicAppId: env('NEXT_PUBLIC_META_APP_ID') || env('META_APP_ID') || DEFAULT_META_APP_ID,
    appSecret: env('META_APP_SECRET') || env('META_WHATSAPP_APP_SECRET') || env('WHATSAPP_APP_SECRET'),
    embeddedSignupConfigId: env('META_EMBEDDED_SIGNUP_CONFIG_ID') || DEFAULT_EMBEDDED_SIGNUP_CONFIG_ID,
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
  const appId = cfg.publicAppId || cfg.appId;
  const configId = cfg.embeddedSignupConfigId;
  return {
    appId,
    configId,
    graphVersion: cfg.graphVersion,
    configured: Boolean(appId && configId),
    existingConfigured: Boolean(cfg.systemUserAccessToken && cfg.wabaId && cfg.phoneNumberId),
    techProvider: true,
    urls: {
      zeroIntegration: zeroIntegrationOnboardingUrl({ appId, configId }).toString(),
      hostedEmbeddedSignup: metaHostedEmbeddedSignupUrl({ appId, configId }).toString(),
    },
    flows: {
      zeroIntegration: `/api/public/wa-onboard/meta/start?mode=new&flow=zero`,
      hostedEmbeddedSignup: `/api/public/wa-onboard/meta/start?mode=new&flow=hosted`,
      existingWaba: `/api/public/wa-onboard/meta/start?mode=existing&flow=hosted`,
    },
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
