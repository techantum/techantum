export type EmbeddedSignupMode = 'new' | 'existing';
export type MetaOnboardingFlow = 'hosted' | 'zero';

export type FacebookLoginResponse = {
  status?: 'connected' | 'not_authorized' | 'unknown' | string;
  authResponse?: {
    code?: string;
    accessToken?: string;
    expiresIn?: number | string;
    signedRequest?: string;
    userID?: string;
  } | null;
};

export function facebookAuthFromResponse(response?: FacebookLoginResponse | null) {
  const auth = response?.authResponse;
  if (!auth) return null;
  if (response?.status && response.status !== 'connected') return null;
  if (!auth.code && !auth.accessToken) return null;
  return { code: auth.code || '', accessToken: auth.accessToken };
}

export function embeddedSignupExtras(_mode: EmbeddedSignupMode = 'new') {
  return {
    version: 'v4',
    sessionInfoVersion: '3',
    featureType: 'whatsapp_business_app_onboarding',
  };
}

export function embeddedSignupStartPath(mode: EmbeddedSignupMode = 'existing', flow: MetaOnboardingFlow = 'hosted') {
  return `/api/public/wa-onboard/meta/start?mode=${mode}&flow=${flow}`;
}

export function facebookEmbeddedSignupLoginOpts(input: { configId?: string; mode?: EmbeddedSignupMode }) {
  const extras = embeddedSignupExtras(input.mode || 'new');
  if (input.configId) {
    return {
      config_id: input.configId,
      response_type: 'code',
      override_default_response_type: true,
      extras,
    };
  }
  return {
    scope: 'business_management,whatsapp_business_management,whatsapp_business_messaging',
    response_type: 'code',
    override_default_response_type: true,
    return_scopes: true,
    extras,
  };
}

export function facebookLoginFailureMessage(response: FacebookLoginResponse, mode: EmbeddedSignupMode = 'existing') {
  const status = String(response.status || '');
  if (status === 'not_authorized') {
    return 'Facebook signed you in, but WhatsApp Business permissions were not granted. Use the Facebook account that owns the existing WhatsApp Business API and accept every WhatsApp permission.';
  }
  if (status === 'unknown') {
    return 'Facebook sign-in finished without WhatsApp access. Complete every Meta screen and allow Techantum to manage the existing WhatsApp Business account.';
  }
  if (mode === 'existing') {
    return 'Facebook permission was not granted. Use the Facebook login that owns the existing WhatsApp Business API, and finish the Meta WhatsApp permission screens.';
  }
  return 'Meta authorization was cancelled.';
}
