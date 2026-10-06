import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  embeddedSignupExtras,
  embeddedSignupStartPath,
  facebookAuthFromResponse,
  facebookEmbeddedSignupLoginOpts,
  facebookLoginFailureMessage,
} from './embedded-signup.ts';

describe('embedded signup login options', () => {
  it('uses Facebook Login for Business with a configuration id', () => {
    const opts = facebookEmbeddedSignupLoginOpts({ configId: 'CFG1', mode: 'existing' });
    assert.equal(opts.config_id, 'CFG1');
    assert.equal(opts.response_type, 'code');
    assert.equal(opts.override_default_response_type, true);
    assert.equal(opts.extras.featureType, 'whatsapp_business_app_onboarding');
    assert.equal(opts.extras.version, 'v4');
    assert.equal(opts.extras.sessionInfoVersion, '3');
    assert.deepEqual(embeddedSignupExtras('existing'), {
      version: 'v4',
      sessionInfoVersion: '3',
      featureType: 'whatsapp_business_app_onboarding',
    });
    assert.equal('scope' in opts, false);
  });

  it('still requests an authorization code when no configuration id is present', () => {
    const opts = facebookEmbeddedSignupLoginOpts({ mode: 'existing' });
    assert.equal(opts.response_type, 'code');
    assert.match(String(opts.scope), /whatsapp_business_management/);
  });

  it('starts WhatsApp onboarding on Meta hosted Embedded Signup, not consumer Facebook Login', () => {
    assert.equal(embeddedSignupStartPath('existing'), '/api/public/wa-onboard/meta/start?mode=existing&flow=hosted');
    assert.equal(embeddedSignupStartPath('new'), '/api/public/wa-onboard/meta/start?mode=new&flow=hosted');
    assert.equal(embeddedSignupStartPath('new', 'zero'), '/api/public/wa-onboard/meta/start?mode=new&flow=zero');
  });
});

describe('facebook login status callback', () => {
  it('reads the official connected authResponse', () => {
    const auth = facebookAuthFromResponse({
      status: 'connected',
      authResponse: { accessToken: 'TOKEN', expiresIn: '3600', signedRequest: 'sig', userID: '99' },
    });
    assert.equal(auth?.accessToken, 'TOKEN');
    assert.equal(auth?.code, '');
  });

  it('ignores signed-in Facebook users who have not authorized the app', () => {
    assert.equal(facebookAuthFromResponse({ status: 'not_authorized', authResponse: null }), null);
    assert.equal(facebookAuthFromResponse({ status: 'unknown' }), null);
  });
});

describe('facebook login failure copy', () => {
  it('explains a signed-in account that withheld WhatsApp permissions', () => {
    const message = facebookLoginFailureMessage({ status: 'not_authorized' }, 'existing');
    assert.match(message, /signed you in/i);
    assert.match(message, /WhatsApp Business permissions/i);
  });

  it('explains a closed Meta session with no token', () => {
    const message = facebookLoginFailureMessage({ status: 'unknown' }, 'existing');
    assert.match(message, /without WhatsApp access/i);
  });
});
