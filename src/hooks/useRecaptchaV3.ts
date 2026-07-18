'use client';

import { useCallback, useEffect, useState } from 'react';

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ?? '';

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadRecaptchaScript(): Promise<void> {
  if (!SITE_KEY) return Promise.resolve();
  if (typeof window !== 'undefined' && window.grecaptcha?.execute) {
    return Promise.resolve();
  }
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src^="https://www.google.com/recaptcha/api.js"]'
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('reCAPTCHA failed to load')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('reCAPTCHA failed to load'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export function useRecaptchaV3() {
  const [ready, setReady] = useState(!SITE_KEY);

  useEffect(() => {
    if (!SITE_KEY) return;

    loadRecaptchaScript()
      .then(() => {
        window.grecaptcha?.ready(() => setReady(true));
      })
      .catch(() => setReady(false));
  }, []);

  const getToken = useCallback(async (action: string): Promise<string | null> => {
    if (!SITE_KEY) return null;

    await loadRecaptchaScript();

    return new Promise((resolve) => {
      window.grecaptcha?.ready(async () => {
        try {
          const token = await window.grecaptcha!.execute(SITE_KEY, { action });
          resolve(token);
        } catch {
          resolve(null);
        }
      });
    });
  }, []);

  return {
    configured: Boolean(SITE_KEY),
    ready,
    getToken,
  };
}
