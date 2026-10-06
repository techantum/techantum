import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  META_HOSTED_EMBEDDED_SIGNUP_EXTRAS,
  facebookLoginRedirectUri,
  facebookSiteLoginUrl,
  metaHostedEmbeddedSignupUrl,
  zeroIntegrationOnboardingUrl,
} from './public-origin.ts';

describe('Meta Tech Provider onboarding URLs', () => {
  const appId = '27686807767646135';
  const configId = '1102324422268818';

  it('builds Zero integration onboarding with only app_id and config_id', () => {
    const url = zeroIntegrationOnboardingUrl({ appId, configId });
    assert.equal(url.origin + url.pathname, 'https://business.facebook.com/messaging/whatsapp/onboard/');
    assert.equal(url.searchParams.get('app_id'), appId);
    assert.equal(url.searchParams.get('config_id'), configId);
    assert.equal(url.searchParams.get('extras'), null);
    assert.equal(url.searchParams.get('redirect_uri'), null);
  });

  it('builds Meta-hosted Embedded Signup with v4 extras and Techantum redirect', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://techantum.com';
    const url = metaHostedEmbeddedSignupUrl({ appId, configId, state: 'waonboard_new_test' });
    assert.equal(url.searchParams.get('app_id'), appId);
    assert.equal(url.searchParams.get('config_id'), configId);
    assert.equal(url.searchParams.get('extras'), JSON.stringify(META_HOSTED_EMBEDDED_SIGNUP_EXTRAS));
    assert.equal(url.searchParams.get('redirect_uri'), 'https://techantum.com/auth/facebook');
    assert.equal(facebookLoginRedirectUri(), 'https://techantum.com/auth/facebook');
    assert.equal(url.searchParams.get('state'), 'waonboard_new_test');
    assert.equal(META_HOSTED_EMBEDDED_SIGNUP_EXTRAS.featureType, 'whatsapp_business_app_onboarding');
  });

  it('builds consumer Facebook Login with email scope and the site redirect', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://techantum.com';
    const url = facebookSiteLoginUrl({
      appId,
      graphVersion: 'v21.0',
      state: 'site_abc',
      responseType: 'token',
    });
    assert.equal(url.origin + url.pathname, 'https://www.facebook.com/v21.0/dialog/oauth');
    assert.equal(url.searchParams.get('client_id'), appId);
    assert.equal(url.searchParams.get('redirect_uri'), 'https://techantum.com/auth/facebook');
    assert.equal(url.searchParams.get('state'), 'site_abc');
    assert.equal(url.searchParams.get('response_type'), 'token');
    assert.equal(url.searchParams.get('scope'), 'email,public_profile');
  });
});
