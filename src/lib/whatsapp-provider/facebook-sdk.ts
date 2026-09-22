'use client';

declare global {
  interface Window {
    FB?: {
      init: (cfg: Record<string, unknown>) => void;
      login: (
        cb: (res: { authResponse?: { code?: string; accessToken?: string } }) => void,
        opts: Record<string, unknown>
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

export type EmbeddedSignupResult = {
  code: string;
  wabaId?: string;
  phoneNumberId?: string;
  businessId?: string;
};

function flattenSignupData(value: unknown, acc: Record<string, string> = {}, prefix = '') {
  if (!value || typeof value !== 'object') return acc;
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}_${key}` : key;
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) flattenSignupData(nested, acc, path);
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

export function loadFacebookSdk(appId: string, version: string) {
  return new Promise<void>((resolve, reject) => {
    if (window.FB) return resolve();
    const timer = window.setTimeout(() => reject(new Error('Facebook SDK timed out.')), 15000);
    window.fbAsyncInit = () => {
      window.clearTimeout(timer);
      window.FB?.init({ appId, cookie: true, xfbml: true, version });
      resolve();
    };
    if (document.getElementById('facebook-jssdk')) return;
    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error('Could not load Facebook SDK.'));
    };
    document.body.appendChild(script);
  });
}

export async function launchEmbeddedSignup(opts: { appId: string; configId: string; graphVersion: string }): Promise<EmbeddedSignupResult> {
  await loadFacebookSdk(opts.appId, opts.graphVersion);
  return new Promise((resolve, reject) => {
    let session: Record<string, string> = {};
    const onMessage = (event: MessageEvent) => {
      const parsed = parseEmbeddedSignupEvent(event);
      if (!parsed) return;
      if (['CANCEL', 'CANCELLED'].includes(parsed.event.toUpperCase())) {
        window.removeEventListener('message', onMessage);
        reject(new Error('WhatsApp connection was cancelled.'));
        return;
      }
      session = { ...session, ...parsed.data };
    };
    window.addEventListener('message', onMessage);
    window.FB?.login(
      (response) => {
        window.removeEventListener('message', onMessage);
        const code = response.authResponse?.code;
        if (!code) {
          reject(new Error('Meta authorization was cancelled.'));
          return;
        }
        resolve({
          code,
          wabaId: session.waba_id || session.wabaId,
          phoneNumberId: session.phone_number_id || session.phoneNumberId,
          businessId: session.business_id || session.businessId,
        });
      },
      {
        config_id: opts.configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: { setup: {}, sessionInfoVersion: '3' },
      }
    );
  });
}
