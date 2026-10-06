'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';
import { safeNextPath } from '@/lib/auth/safe-next';
import type { SiteBranding } from '@/lib/cms/types';

type AuthConfig = {
  googleClientId?: string;
  facebookAppId?: string;
};

type PanelMode = 'signin' | 'signup' | 'forgot' | 'whatsapp';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-secondary/40 focus:bg-white focus:ring-2 focus:ring-secondary/15';

export default function SiteLoginPanel({ branding }: { branding?: SiteBranding }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const next = useMemo(() => safeNextPath(searchParams.get('next')), [searchParams]);
  const [csrfToken, setCsrfToken] = useState('');
  const [config, setConfig] = useState<AuthConfig>({});
  const [mode, setMode] = useState<PanelMode>('signin');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState(searchParams.get('error') || '');
  const [notice, setNotice] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
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
      if (data.user) {
        setSignedInEmail(data.user.email || data.user.phone || 'your account');
        router.replace(next);
      }
    });
  }, [next, router, supabase]);

  const finishAfterSession = async () => {
    const res = await fetch('/api/public/auth/prepare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ next }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Could not open your workspace.');
    router.push(body.next || next);
    router.refresh();
  };

  const finishOtpSession = async (tokenHash: string) => {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'magiclink',
    });
    if (verifyError) throw new Error(verifyError.message || 'Could not start your session.');
    await finishAfterSession();
  };

  const oauthGoogle = () => {
    setError('');
    if (!config.googleClientId) {
      setError('Google sign-in is not configured yet.');
      return;
    }
    window.location.assign(`/api/public/auth/google/start?next=${encodeURIComponent(next)}`);
  };

  const oauthFacebook = () => {
    setError('');
    if (!config.facebookAppId) {
      setError('Facebook sign-in is not configured yet.');
      return;
    }
    window.location.assign(`/api/public/auth/facebook/start?next=${encodeURIComponent(next)}`);
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
      await finishOtpSession(body.tokenHash);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify the code.');
    } finally {
      setBusy('');
    }
  };

  const signInWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy('email');
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) throw new Error(signInError.message || 'Could not sign in.');
      await finishAfterSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setBusy('');
    }
  };

  const signUpWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy('signup');
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (signUpError) throw new Error(signUpError.message || 'Could not create your account.');
      if (data.session) {
        await finishAfterSession();
        return;
      }
      setNotice('Check your email to confirm your account, then sign in.');
      setMode('signin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account.');
    } finally {
      setBusy('');
    }
  };

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy('reset');
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      });
      if (resetError) throw new Error(resetError.message || 'Could not send the reset link.');
      setNotice('If an account exists for that email, a reset link is on its way.');
      setMode('signin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reset link.');
    } finally {
      setBusy('');
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSignedInEmail('');
  };

  const switchMode = (nextMode: PanelMode) => {
    setError('');
    setNotice('');
    setMode(nextMode);
    if (nextMode !== 'whatsapp') {
      setOtpSent(false);
      setCode('');
    }
  };

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] sm:p-8 lg:p-9">
      <div className="mb-6 text-center">
        {branding?.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={branding.logo_url} alt={branding.company_name} className="mx-auto mb-3 h-12 w-auto object-contain" />
        ) : (
          <p className="font-bricolage text-2xl font-bold tracking-tight text-slate-900">
            techantum
            <span className="block text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">solutions</span>
          </p>
        )}
        <p className="mt-1 text-sm font-medium text-slate-900">Welcome to {branding?.company_name || 'Techantum Solutions'}</p>
        <p className="mt-1 text-sm text-slate-500">
          {mode === 'signup'
            ? 'Create your WhatsApp Business API workspace in a few minutes.'
            : mode === 'forgot'
              ? 'Enter your email and we will send a reset link.'
              : 'Log in to your WhatsApp Business API portal and continue managing your business.'}
        </p>
      </div>

      {error && (
        <div className="mb-4 flex gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <Icon name="ExclamationCircleIcon" size={18} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <Icon name="CheckCircleIcon" size={18} className="mt-0.5 shrink-0" />
          {notice}
        </div>
      )}

      {signedInEmail ? (
        <div className="text-center">
          <p className="mb-4 text-sm text-slate-600">{signedInEmail}</p>
          <Link
            href={next}
            className="flex w-full items-center justify-center rounded-full bg-secondary py-3.5 text-sm font-semibold text-white transition hover:bg-secondary/90"
          >
            Continue to workspace
          </Link>
          <button type="button" onClick={signOut} className="mt-3 text-sm text-slate-500 hover:text-slate-800">
            Use a different account
          </button>
        </div>
      ) : (
        <>
          {mode !== 'forgot' && (
            <div className="space-y-3">
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={oauthGoogle}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-3">
                  <GoogleMark />
                  Continue with Google
                </span>
                <Icon name="ArrowRightIcon" size={16} className="text-slate-400" />
              </button>
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={oauthFacebook}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-3">
                  <FacebookMark />
                  Continue with Facebook
                </span>
                <Icon name="ArrowRightIcon" size={16} className="text-slate-400" />
              </button>
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => switchMode(mode === 'whatsapp' ? 'signin' : 'whatsapp')}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-3">
                  <span className="text-[#25D366]">
                    <WhatsAppMark />
                  </span>
                  Continue with WhatsApp
                </span>
                <Icon name="ArrowRightIcon" size={16} className="text-slate-400" />
              </button>
            </div>
          )}

          {mode === 'whatsapp' && (
            <div className="mt-4">
              {!otpSent ? (
                <form onSubmit={sendOtp} className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">
                    WhatsApp number
                    <input
                      className={`${inputClass} mt-1.5`}
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="+91 98765 43210"
                      required
                      autoFocus
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={busy === 'otp-send' || !csrfToken}
                    className="w-full rounded-full bg-slate-900 py-3.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {busy === 'otp-send' ? 'Sending code…' : 'Send WhatsApp code'}
                  </button>
                </form>
              ) : (
                <form onSubmit={verifyOtp} className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">
                    6-digit code
                    <input
                      className={`${inputClass} mt-1.5 text-center font-semibold tracking-[0.4em]`}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      required
                      autoFocus
                      placeholder="000000"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={busy === 'otp-verify' || code.length !== 6}
                    className="w-full rounded-full bg-secondary py-3.5 text-sm font-semibold text-white hover:bg-secondary/90 disabled:opacity-60"
                  >
                    {busy === 'otp-verify' ? 'Verifying…' : 'Verify and continue'}
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

          {mode !== 'whatsapp' && (
            <>
              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">or</span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              {mode === 'forgot' ? (
                <form onSubmit={sendReset} className="space-y-4">
                  <Field label="Email address">
                    <input
                      className={inputClass}
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </Field>
                  <button
                    type="submit"
                    disabled={busy === 'reset'}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-secondary py-3.5 text-sm font-semibold text-white transition hover:bg-secondary/90 disabled:opacity-60"
                  >
                    {busy === 'reset' ? 'Sending…' : 'Send reset link'}
                    <Icon name="ArrowRightIcon" size={16} />
                  </button>
                  <button type="button" onClick={() => switchMode('signin')} className="w-full text-sm text-slate-500 hover:text-slate-800">
                    Back to sign in
                  </button>
                </form>
              ) : mode === 'signup' ? (
                <form onSubmit={signUpWithEmail} className="space-y-4">
                  <Field label="Full name">
                    <input
                      className={inputClass}
                      autoComplete="name"
                      placeholder="Your name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </Field>
                  <Field label="Email address">
                    <input
                      className={inputClass}
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </Field>
                  <Field label="Password">
                    <PasswordInput
                      value={password}
                      show={showPassword}
                      onToggle={() => setShowPassword((v) => !v)}
                      onChange={setPassword}
                      autoComplete="new-password"
                    />
                  </Field>
                  <button
                    type="submit"
                    disabled={busy === 'signup'}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-secondary py-3.5 text-sm font-semibold text-white transition hover:bg-secondary/90 disabled:opacity-60"
                  >
                    {busy === 'signup' ? 'Creating account…' : 'Get started free'}
                    <Icon name="ArrowRightIcon" size={16} />
                  </button>
                  <p className="text-center text-sm text-slate-500">
                    Already have an account?{' '}
                    <button type="button" onClick={() => switchMode('signin')} className="font-semibold text-secondary hover:underline">
                      Sign in
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={signInWithEmail} className="space-y-4">
                  <Field label="Email address">
                    <input
                      className={inputClass}
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </Field>
                  <Field label="Password">
                    <PasswordInput
                      value={password}
                      show={showPassword}
                      onToggle={() => setShowPassword((v) => !v)}
                      onChange={setPassword}
                      autoComplete="current-password"
                    />
                  </Field>
                  <div className="flex justify-end">
                    <button type="button" onClick={() => switchMode('forgot')} className="text-sm font-medium text-secondary hover:underline">
                      Forgot password?
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={busy === 'email'}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-secondary py-3.5 text-sm font-semibold text-white transition hover:bg-secondary/90 disabled:opacity-60"
                  >
                    {busy === 'email' ? 'Signing in…' : 'Sign in'}
                    <Icon name="ArrowRightIcon" size={16} />
                  </button>
                  <p className="text-center text-sm text-slate-500">
                    Don&apos;t have an account?{' '}
                    <button type="button" onClick={() => switchMode('signup')} className="font-semibold text-secondary hover:underline">
                      Get started free
                    </button>
                  </p>
                </form>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function PasswordInput({
  value,
  show,
  onToggle,
  onChange,
  autoComplete,
}: {
  value: string;
  show: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  return (
    <div className="relative">
      <input
        className={`${inputClass} pr-12`}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        required
        placeholder="Enter your password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute inset-y-0 right-3 text-slate-400 hover:text-slate-700"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        <Icon name={show ? 'EyeSlashIcon' : 'EyeIcon'} size={18} />
      </button>
    </div>
  );
}

function FacebookMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953h-1.513c-1.491 0-1.956.928-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"
      />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.3 12 2.3 6.9 2.3 2.8 6.4 2.8 11.5S6.9 20.7 12 20.7c6.9 0 9.1-4.8 9.1-7.3 0-.5 0-.8-.1-1.2H12z"
      />
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
