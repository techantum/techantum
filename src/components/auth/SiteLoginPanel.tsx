'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';
import { safeNextPath } from '@/lib/auth/safe-next';

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
  const [busy, setBusy] = useState<'google' | 'otp-send' | 'otp-verify' | ''>('');
  const [error, setError] = useState(searchParams.get('error') || '');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
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
      if (data.user) {
        setSignedInEmail(data.user.email || data.user.phone || 'your account');
        router.replace(next);
      }
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
    if (!config.googleClientId) {
      setError('Google sign-in is not configured yet.');
      return;
    }
    window.location.assign(`/api/public/auth/google/start?next=${encodeURIComponent(next)}`);
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
  };

  if (signedInEmail) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 text-center">
        <p className="text-sm text-slate-600 mb-4">{signedInEmail}</p>
        <Link href={next} className="block w-full rounded-xl bg-indigo-600 text-white py-3 text-sm font-semibold hover:bg-indigo-700">
          Continue
        </Link>
        <button type="button" onClick={signOut} className="mt-3 text-sm text-slate-500 hover:text-slate-800">
          Use a different account
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex gap-2">
          <Icon name="ExclamationCircleIcon" size={18} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="space-y-3">
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={oauthGoogle}
          className="w-full inline-flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
        >
          <GoogleMark />
          Login with Google
        </button>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => {
            setError('');
            setWhatsappOpen(true);
          }}
          className="w-full inline-flex items-center justify-center gap-3 rounded-xl bg-[#25D366] py-3.5 text-sm font-semibold text-white hover:bg-[#1ebe5d] disabled:opacity-60"
        >
          <WhatsAppMark />
          Login with WhatsApp
        </button>
      </div>

      {whatsappOpen && (
        <div className="mt-4">
          {!otpSent ? (
            <form onSubmit={sendOtp} className="space-y-3">
              <input
                className={inputClass}
                inputMode="tel"
                autoComplete="tel"
                placeholder="+91 98765 43210"
                required
                autoFocus
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <button
                type="submit"
                disabled={busy === 'otp-send' || !csrfToken}
                className="w-full rounded-xl bg-slate-900 text-white py-3 text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
              >
                {busy === 'otp-send' ? 'Sending code…' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-3">
              <input
                className={`${inputClass} tracking-[0.4em] text-center font-semibold`}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                autoFocus
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <button
                type="submit"
                disabled={busy === 'otp-verify' || code.length !== 6}
                className="w-full rounded-xl bg-slate-900 text-white py-3 text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
              >
                {busy === 'otp-verify' ? 'Verifying…' : 'Verify OTP'}
              </button>
              <button
                type="button"
                className="w-full text-sm text-slate-500 hover:text-slate-800"
                onClick={() => {
                  setOtpSent(false);
                  setCode('');
                }}
              >
                Use a different number
              </button>
            </form>
          )}
        </div>
      )}
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

function WhatsAppMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.27-1.38a9.86 9.86 0 0 0 4.77 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.91-7.01zm-7.01 15.24h-.01a8.18 8.18 0 0 1-4.16-1.14l-.3-.18-3.13.82.84-3.05-.2-.31a8.18 8.18 0 0 1-1.26-4.38c0-4.52 3.68-8.2 8.21-8.2 2.19 0 4.25.85 5.8 2.4a8.15 8.15 0 0 1 2.4 5.8c0 4.53-3.68 8.21-8.19 8.21zm4.5-6.14c-.25-.12-1.46-.72-1.69-.8-.23-.09-.39-.12-.56.12-.16.25-.64.8-.78.96-.14.16-.29.18-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42h-.48c-.16 0-.43.06-.65.31-.22.25-.86.84-.86 2.05 0 1.21.88 2.38 1 2.54.12.16 1.73 2.64 4.19 3.7.59.25 1.04.4 1.4.52.59.19 1.12.16 1.54.1.47-.07 1.46-.6 1.67-1.17.2-.58.2-1.07.14-1.17-.06-.11-.22-.16-.47-.28z"
      />
    </svg>
  );
}
