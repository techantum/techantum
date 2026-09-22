'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';
import { safeNextPath } from '@/lib/auth/safe-next';
import { loadFacebookSdk } from '@/lib/whatsapp-provider/facebook-sdk';

type AuthConfig = {
  googleClientId?: string;
  facebookAppId?: string;
  facebookSdkVersion?: string;
  googleOrigin?: string;
  googleRedirectUri?: string;
};

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300';

export default function SiteLoginPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const next = useMemo(() => safeNextPath(searchParams.get('next')), [searchParams]);
  const [csrfToken, setCsrfToken] = useState('');
  const [config, setConfig] = useState<AuthConfig>({});
  const [busy, setBusy] = useState<'google' | 'facebook' | 'otp-send' | 'otp-verify' | ''>('');
  const [error, setError] = useState(searchParams.get('error') || '');
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState('');

  useEffect(() => {
    fetch('/api/csrf')
      .then((r) => r.json())
      .then((body) => setCsrfToken(body.token || ''))
      .catch(() => undefined);
    fetch('/api/public/auth/config', { cache: 'no-store' })
      .then((r) => r.json())
      .then((body) => setConfig(body || {}))
      .catch(() => undefined);
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setSignedInEmail(data.user.email || data.user.phone || 'your account');
    });
  }, [supabase]);

  const finishSession = async (tokenHash: string) => {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'magiclink',
    });
    if (verifyError) throw new Error(verifyError.message || 'Could not start your session.');
    router.push(next);
    router.refresh();
  };

  const oauthGoogle = () => {
    setError('');
    if (!csrfToken) {
      setError('Please wait a moment and try again.');
      return;
    }
    setBusy('google');
    window.location.assign(`/api/public/auth/google/start?next=${encodeURIComponent(next)}`);
  };

  const oauthFacebook = async () => {
    setError('');
    setBusy('facebook');
    try {
      if (!config.facebookAppId) {
        throw new Error('Facebook sign-in is not configured yet. Please use Google or WhatsApp OTP.');
      }
      await loadFacebookSdk(config.facebookAppId, config.facebookSdkVersion || 'v21.0');
      const accessToken = await new Promise<string>((resolve, reject) => {
        window.FB?.login(
          (response) => {
            const token = response.authResponse?.accessToken;
            if (!token) reject(new Error('Facebook sign-in was cancelled.'));
            else resolve(token);
          },
          { scope: 'email,public_profile' }
        );
      });
      const res = await fetch('/api/public/auth/facebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, csrfToken }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Facebook sign-in failed.');
      await finishSession(body.tokenHash);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Facebook sign-in failed.');
    } finally {
      setBusy('');
    }
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy('otp-send');
    const res = await fetch('/api/public/auth/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, csrfToken, honeypot: '' }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy('');
    if (!res.ok) {
      setError(body.error || 'Could not send the WhatsApp code.');
      return;
    }
    setOtpSent(true);
    setMessage('We sent a 6-digit code to your WhatsApp. Enter it below to finish signing in.');
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy('otp-verify');
    try {
      const res = await fetch('/api/public/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, csrfToken }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not verify the code.');
      await finishSession(body.tokenHash);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify the code.');
    } finally {
      setBusy('');
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSignedInEmail('');
    setMessage('');
  };

  if (signedInEmail) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-3">Signed in</p>
        <h2 className="font-bricolage text-2xl font-bold text-slate-900 mb-2">You are already signed in</h2>
        <p className="text-sm text-slate-600 mb-6">{signedInEmail}</p>
        <Link href={next} className="block text-center w-full rounded-xl bg-indigo-600 text-white py-3 text-sm font-semibold hover:bg-indigo-700">
          Continue to your workspace
        </Link>
        <button type="button" onClick={signOut} className="mt-4 text-sm text-slate-500 hover:text-slate-800">
          Use a different account
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-3">TechAntum account</p>
      <h2 className="font-bricolage text-2xl font-bold text-slate-900 mb-2">Sign in</h2>
      <p className="text-sm text-slate-600 mb-6">
        Use Google, Facebook, or a one-time code on WhatsApp. No password to remember.
      </p>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex gap-2">
          <Icon name="ExclamationCircleIcon" size={18} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>
      )}

      <div className="space-y-3">
        <button
          type="button"
          disabled={Boolean(busy) || !csrfToken}
          onClick={() => void oauthGoogle()}
          className="w-full inline-flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
        >
          <GoogleMark />
          {busy === 'google' ? 'Opening Google…' : 'Sign in with Google'}
        </button>
        <button
          type="button"
          disabled={Boolean(busy) || !csrfToken}
          onClick={() => void oauthFacebook()}
          className="w-full inline-flex items-center justify-center gap-3 rounded-xl bg-[#1877F2] py-3 text-sm font-semibold text-white hover:bg-[#166fe0] disabled:opacity-60"
        >
          <FacebookMark />
          {busy === 'facebook' ? 'Opening Facebook…' : 'Sign in with Facebook'}
        </button>
      </div>

      <div className="flex items-center gap-3 my-6">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs uppercase tracking-wider text-slate-400">or WhatsApp OTP</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      {!otpSent ? (
        <form onSubmit={sendOtp} className="space-y-3">
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">WhatsApp number</span>
            <input
              className={inputClass}
              inputMode="tel"
              autoComplete="tel"
              placeholder="+91 98765 43210"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={busy === 'otp-send' || !csrfToken}
            className="w-full rounded-xl bg-indigo-600 text-white py-3 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy === 'otp-send' ? 'Sending code…' : 'Send OTP to WhatsApp'}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-3">
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">6-digit code</span>
            <input
              className={`${inputClass} tracking-[0.4em] text-center font-semibold`}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </label>
          <button
            type="submit"
            disabled={busy === 'otp-verify' || code.length !== 6}
            className="w-full rounded-xl bg-indigo-600 text-white py-3 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy === 'otp-verify' ? 'Verifying…' : 'Verify and sign in'}
          </button>
          <button
            type="button"
            className="text-sm text-slate-500 hover:text-slate-800"
            onClick={() => {
              setOtpSent(false);
              setCode('');
              setMessage('');
            }}
          >
            Use a different number
          </button>
        </form>
      )}

      <p className="mt-5 text-xs text-slate-500">
        Facebook sign-in is for your TechAntum website account. Connecting a WhatsApp Business number happens later in your workspace, through Meta.
      </p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.3 12 2.3 6.9 2.3 2.8 6.4 2.8 11.5S6.9 20.7 12 20.7c6.9 0 9.1-4.8 9.1-7.3 0-.5 0-.8-.1-1.2H12z" />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M22 12.07C22 6.5 17.52 2 12 2S2 6.5 2 12.07C2 17.1 5.66 21.24 10.44 22v-7.03H7.9v-2.9h2.54V9.84c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.9h-2.34V22C18.34 21.24 22 17.1 22 12.07z"
      />
    </svg>
  );
}
