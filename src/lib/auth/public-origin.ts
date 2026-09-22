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
  url.searchParams.set(
    'extras',
    JSON.stringify(
      input.mode === 'new'
        ? { version: 'v4', sessionInfoVersion: '3', featureType: 'whatsapp_business_app_onboarding' }
        : { version: 'v4', sessionInfoVersion: '3' }
    )
  );
  return url;
}
