'use client';

import {
  facebookAuthFromResponse,
  facebookEmbeddedSignupLoginOpts,
  facebookLoginFailureMessage,
  type EmbeddedSignupMode,
  type FacebookLoginResponse,
} from './embedded-signup';

declare global {
  interface Window {
    FB?: {
      init: (cfg: Record<string, unknown>) => void;
      login: (cb: (res: FacebookLoginResponse) => void, opts: Record<string, unknown>) => void;
      getLoginStatus: (cb: (res: FacebookLoginResponse) => void, force?: boolean) => void;
      AppEvents?: { logPageView: () => void };
      XFBML?: { parse: (node?: Element | null) => void };
    };
    fbAsyncInit?: () => void;
    checkLoginState?: () => void;
    statusChangeCallback?: (response: FacebookLoginResponse) => void;
  }
}

export type EmbeddedSignupResult = {
  code: string;
  accessToken?: string;
  wabaId?: string;
  phoneNumberId?: string;
  businessId?: string;
};

type SignupSession = Record<string, string>;

let sdkReady: Promise<void> | null = null;
let initializedKey = '';

function flattenSignupData(value: unknown, acc: Record<string, string> = {}, prefix = '') {
  if (!value || typeof value !== 'object') return acc;
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}_${key}` : key;
    if (Array.isArray(nested) && nested.length) {
      const first = nested[0];
      acc[key] = typeof first === 'object' && first ? String((first as { id?: string }).id || first) : String(first);
      if (key === 'waba_ids' && !acc.waba_id) acc.waba_id = acc[key];
    } else if (nested && typeof nested === 'object') flattenSignupData(nested, acc, path);
    else if (nested != null) acc[key] = String(nested);
  }
  return acc;
}

export function parseEmbeddedSignupEvent(event: MessageEvent) {
  if (!String(event.origin || '').includes('facebook.com')) return null;
  try {
    const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    if (payload?.type !== 'WA_EMBEDDED_SIGNUP') return null;
    return {
      event: String(payload.event || ''),
      data: flattenSignupData(payload.data || payload),
    };
  } catch {
    return null;
  }
}

function ensureFbRoot() {
  if (document.getElementById('fb-root')) return;
  const root = document.createElement('div');
  root.id = 'fb-root';
  document.body.insertBefore(root, document.body.firstChild);
}

function insertFacebookSdkScript() {
  if (document.getElementById('facebook-jssdk')) return;
  const js = document.createElement('script');
  js.id = 'facebook-jssdk';
  js.src = 'https://connect.facebook.net/en_US/sdk.js';
  js.async = true;
  js.defer = true;
  const fjs = document.getElementsByTagName('script')[0];
  if (fjs?.parentNode) fjs.parentNode.insertBefore(js, fjs);
  else document.body.appendChild(js);
}

export function loadFacebookSdk(appId: string, version: string) {
  const key = `${appId}:${version}`;
  if (sdkReady && initializedKey === key) return sdkReady;
  initializedKey = key;
  sdkReady = new Promise<void>((resolve, reject) => {
    ensureFbRoot();
    const timer = window.setTimeout(() => reject(new Error('Facebook SDK timed out.')), 15000);
    const finish = () => {
      window.clearTimeout(timer);
      if (!window.FB) {
        reject(new Error('Facebook SDK did not initialize. Refresh the page and try again.'));
        return;
      }
      window.FB.init({ appId, cookie: true, xfbml: true, version });
      window.FB.AppEvents?.logPageView();
      window.checkLoginState = () => {
        void checkLoginState();
      };
      resolve();
    };
    const previousInit = window.fbAsyncInit;
    window.fbAsyncInit = () => {
      previousInit?.();
      finish();
    };
    if (window.FB) {
      finish();
      return;
    }
    insertFacebookSdkScript();
  }).catch((error) => {
    sdkReady = null;
    initializedKey = '';
    throw error;
  });
  return sdkReady;
}

export function getFacebookLoginStatus(force = true) {
  return new Promise<FacebookLoginResponse>((resolve, reject) => {
    if (!window.FB?.getLoginStatus) {
      reject(new Error('Facebook SDK did not initialize. Refresh the page and try again.'));
      return;
    }
    window.FB.getLoginStatus((response) => resolve(response || { status: 'unknown' }), force);
  });
}

export function statusChangeCallback(response: FacebookLoginResponse) {
  window.statusChangeCallback?.(response);
  return response;
}

export async function checkLoginState() {
  const response = await getFacebookLoginStatus(true);
  return statusChangeCallback(response);
}

function subscribeSignupSession(onCancel: (error: Error) => void) {
  const session: SignupSession = {};
  const onMessage = (event: MessageEvent) => {
    const parsed = parseEmbeddedSignupEvent(event);
    if (!parsed) return;
    if (['CANCEL', 'CANCELLED'].includes(parsed.event.toUpperCase())) {
      onCancel(new Error('WhatsApp connection was cancelled.'));
      return;
    }
    Object.assign(session, parsed.data);
  };
  window.addEventListener('message', onMessage);
  return {
    session,
    stop: () => window.removeEventListener('message', onMessage),
  };
}

function resultFromAuth(response: FacebookLoginResponse | null | undefined, session: SignupSession): EmbeddedSignupResult | null {
  const auth = facebookAuthFromResponse(response);
  if (!auth) return null;
  return {
    ...auth,
    wabaId: session.waba_id || session.wabaId,
    phoneNumberId: session.phone_number_id || session.phoneNumberId,
    businessId: session.business_id || session.businessId,
  };
}

export async function connectFromCurrentFacebookSession(): Promise<EmbeddedSignupResult> {
  const response = await checkLoginState();
  const result = resultFromAuth(response, {});
  if (!result) throw new Error(facebookLoginFailureMessage(response));
  return result;
}

export async function launchExistingWabaImport(opts: {
  appId: string;
  graphVersion: string;
  configId?: string;
}): Promise<EmbeddedSignupResult> {
  return launchEmbeddedSignup({ ...opts, mode: 'existing' });
}

export async function launchEmbeddedSignup(opts: {
  appId: string;
  configId?: string;
  graphVersion: string;
  mode?: EmbeddedSignupMode;
}): Promise<EmbeddedSignupResult> {
  await loadFacebookSdk(opts.appId, opts.graphVersion);
  const mode: EmbeddedSignupMode = opts.mode === 'existing' ? 'existing' : 'new';
  const login = subscribeSignupSession(() => undefined);
  try {
    const current = await getFacebookLoginStatus(true);
    statusChangeCallback(current);

    const fromLogin = await new Promise<FacebookLoginResponse>((resolve, reject) => {
      if (!window.FB) {
        reject(new Error('Facebook SDK did not initialize. Refresh the page and try again.'));
        return;
      }
      window.FB.login((response) => resolve(response || { status: 'unknown' }), facebookEmbeddedSignupLoginOpts({ configId: opts.configId, mode }));
    });

    const latest = facebookAuthFromResponse(fromLogin) ? fromLogin : await checkLoginState();
    const result = resultFromAuth(fromLogin, login.session) || resultFromAuth(latest, login.session);
    if (!result) throw new Error(facebookLoginFailureMessage(latest || fromLogin, mode));
    return result;
  } finally {
    login.stop();
  }
}
