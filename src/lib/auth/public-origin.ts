export function publicSiteOrigin() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://techantum.com'
  ).replace(/\/$/, '');
}

export function facebookLoginRedirectUri() {
  return `${publicSiteOrigin()}/auth/facebook`;
}

export function metaHostedEmbeddedSignupUrl(input: {
  appId: string;
  configId: string;
  state: string;
  mode: 'new' | 'existing';
}) {
  const url = new URL('https://business.facebook.com/messaging/whatsapp/onboard/');
  url.searchParams.set('app_id', input.appId);
  url.searchParams.set('config_id', input.configId);
  url.searchParams.set('redirect_uri', facebookLoginRedirectUri());
  url.searchParams.set('state', input.state);
  return url;
}

export function facebookWhatsAppOauthUrl(input: { appId: string; graphVersion: string; state: string }) {
  const url = new URL(`https://www.facebook.com/${input.graphVersion || 'v21.0'}/dialog/oauth`);
  url.searchParams.set('client_id', input.appId);
  url.searchParams.set('redirect_uri', facebookLoginRedirectUri());
  url.searchParams.set('state', input.state);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'business_management,whatsapp_business_management,whatsapp_business_messaging');
  return url;
}
