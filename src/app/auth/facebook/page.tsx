'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function readParam(search: URLSearchParams, hash: URLSearchParams, key: string) {
  return search.get(key) || hash.get(key) || '';
}

function facebookOAuthError(search: URLSearchParams, hash: URLSearchParams) {
  const message = readParam(search, hash, 'error_message') || readParam(search, hash, 'error_description');
  const error = readParam(search, hash, 'error');
  const code = readParam(search, hash, 'error_code');
  if (!message && !error && !code) return '';
  if (error === 'access_denied') return 'Facebook authorization was cancelled.';
  if (/bsp|tech provider|embedded signup is only/i.test(message)) {
    return 'Meta allows new WhatsApp number signup only for Tech Provider apps. If you already have a WABA, go back and choose I already have a WABA.';
  }
  if (/invalid scopes/i.test(message) || code === '100') {
    return 'Meta rejected a Facebook Login permission. Go back and choose I already have a WABA, or I am new to WhatsApp Business API.';
  }
  return message || error || `Meta authorization failed (${code || 'unknown'}).`;
}

function FacebookCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const oauthError = facebookOAuthError(searchParams, hash);
      if (oauthError) {
        setError(oauthError);
        return;
      }

      const accessToken = hash.get('access_token') || '';
      const code = searchParams.get('code') || '';
      const state = hash.get('state') || searchParams.get('state') || '';
      const wabaId = searchParams.get('waba_id') || hash.get('waba_id') || '';
      const phoneNumberId = searchParams.get('phone_number_id') || hash.get('phone_number_id') || '';
      const businessId = searchParams.get('business_id') || hash.get('business_id') || '';
      if (!accessToken && !code) {
        setError('Facebook did not return a token. Add https://techantum.com/auth/facebook as a Valid OAuth Redirect URI.');
        return;
      }

      const { data: sessionData } = await supabase.auth.getUser();
      const isWhatsAppOnboard = state.startsWith('waonboard_') || (Boolean(sessionData.user) && !state.startsWith('site_'));
      if (isWhatsAppOnboard) {
        const res = await fetch('/api/public/wa-onboard/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken, code, state, wabaId, phoneNumberId, businessId }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(body.error || 'WhatsApp Business API connection failed.');
          return;
        }
        router.replace('/portal/wa/onboard?connected=1');
        router.refresh();
        return;
      }

      const csrfRes = await fetch('/api/csrf', { cache: 'no-store' });
      const csrfBody = await csrfRes.json().catch(() => ({}));
      const res = await fetch('/api/public/auth/facebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, code, state, csrfToken: csrfBody.token || '' }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || 'Facebook sign-in failed.');
        return;
      }
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: body.tokenHash,
        type: 'magiclink',
      });
      if (verifyError) {
        setError(verifyError.message || 'Could not start your session.');
        return;
      }
      router.replace(body.next || '/portal/wa');
      router.refresh();
    };
    void run();
  }, [router, searchParams, supabase]);

  return (
    <main className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-6 text-center">
        {error ? (
          <>
            <p className="text-sm text-rose-700 mb-4">{error}</p>
            <a href="/portal/wa/onboard" className="inline-flex rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-semibold">
              Back to onboarding
            </a>
          </>
        ) : (
          <p className="text-sm text-slate-600">Connecting to Meta…</p>
        )}
      </div>
    </main>
  );
}

export default function FacebookCallbackPage() {
  return (
    <Suspense fallback={<main className="min-h-[60vh] flex items-center justify-center p-6 text-sm text-slate-500">Connecting to Meta…</main>}>
      <FacebookCallbackInner />
    </Suspense>
  );
}
