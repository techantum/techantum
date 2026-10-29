'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { EmailField, NameField, PasswordField } from '@/components/ui/FormFields';
import Icon from '@/components/ui/AppIcon';
import { useProcess } from '@/components/ui/ProcessOverlay';
import { emailError, isStrongPassword, nameError } from '@/lib/forms/rules';
import { AUTH_PORTALS, type AuthPortal } from '@/lib/saas/portals';
import {
  DEFAULT_PHONE_COUNTRY,
  formatWhatsAppDisplay,
  otherPhoneCountries,
  phoneCountryByIso,
  popularPhoneCountries,
} from '@/lib/saas/phone-countries';

export default function AuthForm({ mode, portal = 'subscriber' }: { mode: 'login' | 'signup'; portal?: AuthPortal }) {
  const search = useSearchParams();
  const overlay = useProcess();
  const packageId = search.get('package') || '';
  const packageQuery = packageId ? `?package=${encodeURIComponent(packageId)}` : '';
  const [name, setName] = useState('');
  const [email, setEmail] = useState(search.get('email') || '');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [countryIso, setCountryIso] = useState(DEFAULT_PHONE_COUNTRY);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [waOpen, setWaOpen] = useState(false);
  const [waError, setWaError] = useState('');
  const [error, setError] = useState(search.get('error') || '');
  const [showError, setShowError] = useState(Boolean(search.get('error')));
  const [googleClientId, setGoogleClientId] = useState('');
  const signup = mode === 'signup';

  const goNext = (next?: string) => {
    window.location.assign(next || (packageId ? `/trial?package=${encodeURIComponent(packageId)}` : '/trial'));
  };

  const country = phoneCountryByIso(countryIso);

  const closeWhatsApp = () => {
    setWaOpen(false);
    setWaError('');
    setOtp('');
    setOtpSent(false);
  };

  useEffect(() => {
    fetch('/api/auth/config')
      .then((res) => res.json())
      .then((body) => setGoogleClientId(String(body.googleClientId || '')))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!waOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeWhatsApp();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [waOpen]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setShowError(true);
    if (signup && nameError(name, 'workspace name')) {
      setError(nameError(name, 'workspace name'));
      return;
    }
    if (emailError(email)) {
      setError(emailError(email));
      return;
    }
    if (signup && !isStrongPassword(password)) {
      setError('Enter a password that meets all the conditions.');
      return;
    }
    if (!signup && !password) {
      setError('Enter password.');
      return;
    }
    setError('');
    await overlay.run(signup ? 'Creating your account…' : 'Signing in…', async () => {
      try {
        const response = await fetch(signup ? '/api/auth/signup' : '/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(signup ? { name, email, password, packageId } : { email, password, packageId, portal }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || (signup ? 'Could not create the account' : 'Could not sign in'));
        goNext(body.next);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
    });
  };

  const startGoogle = () => {
    setError('');
    if (!googleClientId) {
      setError('Google sign-in is not configured.');
      return;
    }
    const params = new URLSearchParams();
    if (packageId) params.set('package', packageId);
    window.location.assign(`/api/auth/google/start${params.size ? `?${params.toString()}` : ''}`);
  };

  const sendOtp = async () => {
    setWaError('');
    await overlay.run('Sending WhatsApp code…', async () => {
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, countryCode: country.dial }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Could not send the code');
      setOtpSent(true);
      setOtp('');
    }).catch((err) => setWaError(err instanceof Error ? err.message : 'Could not send the code'));
  };

  const verifyOtp = async () => {
    setWaError('');
    await overlay.run('Signing in…', async () => {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, countryCode: country.dial, code: otp, packageId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Could not verify the code');
      goNext(body.next);
    }).catch((err) => setWaError(err instanceof Error ? err.message : 'Could not verify the code'));
  };

  return (
    <>
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-fuchsia-100 bg-white p-8 shadow-[0_24px_80px_rgba(168,85,247,0.12)]">
        <p className="font-bricolage text-3xl font-bold tracking-tight text-slate-900">{signup ? 'Start your trial' : `${AUTH_PORTALS[portal].label} sign in`}</p>
        <p className="mt-2 text-sm text-slate-500">
          {signup
            ? 'Create your workspace with email and password, or continue with Google or WhatsApp. Autopay is required before the trial starts.'
            : AUTH_PORTALS[portal].hint}
        </p>
        {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        {signup ? (
          <div className="mt-6">
            <NameField label="Workspace name" value={name} onValue={setName} showError={showError} />
          </div>
        ) : null}
        <div className={signup ? 'mt-3' : 'mt-6'}>
          <EmailField value={email} onValue={setEmail} showError={showError} />
        </div>
        <div className="mt-3">
          <PasswordField
            value={password}
            onValue={setPassword}
            showError={showError}
            showRules={signup}
            autoComplete={signup ? 'new-password' : 'current-password'}
          />
        </div>
        <button type="submit" className="btn-primary mt-6 w-full">
          {signup ? 'Continue to Autopay' : 'Sign in'}
        </button>

        {signup || !AUTH_PORTALS[portal].staff ? (
          <>
        <div className="mt-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          or
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          type="button"
          onClick={startGoogle}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          <GoogleMark />
          {signup ? 'Continue with Google' : 'Login with Google'}
        </button>
        <button
          type="button"
          onClick={() => {
            setError('');
            setWaError('');
            setWaOpen(true);
          }}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
        >
          <Icon name="ChatBubbleLeftRightIcon" size={18} />
          {signup ? 'Continue with WhatsApp' : 'Login with WhatsApp'}
        </button>
          </>
        ) : null}

        <p className="mt-4 text-center text-sm text-slate-500">
          {signup ? (
            <>
              Already have an account?{' '}
              <Link href={`/subscriber/login${packageQuery}`} className="font-semibold text-fuchsia-700">
                Sign in
              </Link>
            </>
          ) : portal === 'subscriber' || portal === 'user' ? (
            <>
              No account?{' '}
              <Link href={`/signup${packageQuery}`} className="font-semibold text-fuchsia-700">
                Get started
              </Link>
            </>
          ) : (
            'Use the email and password issued for this console.'
          )}
        </p>
        {!signup ? (
          <p className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1 text-center text-xs text-slate-400">
            {(Object.keys(AUTH_PORTALS) as AuthPortal[]).filter((item) => item !== portal).map((item) => (
              <Link key={item} href={AUTH_PORTALS[item].login} className="font-semibold text-slate-500 hover:text-fuchsia-700">
                {AUTH_PORTALS[item].label}
              </Link>
            ))}
          </p>
        ) : null}
      </form>

      {waOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/40 p-4" onClick={closeWhatsApp}>
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="whatsapp-login-title"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="whatsapp-login-title" className="font-bricolage text-xl font-bold text-slate-900">
                  {otpSent ? 'Enter WhatsApp code' : 'Login with WhatsApp'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {otpSent
                    ? `We sent a 6-digit code to ${formatWhatsAppDisplay(phone, country.dial)}. Enter it to sign in.`
                    : 'Select your country, then enter the WhatsApp number. The country code is added automatically.'}
                </p>
              </div>
              <button type="button" onClick={closeWhatsApp} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
                <Icon name="XMarkIcon" size={20} />
              </button>
            </div>
            {waError ? <p className="mt-4 rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{waError}</p> : null}
            {otpSent ? (
              <div className="mt-4 space-y-3">
                <label className="block text-sm font-medium text-slate-700">6-digit code</label>
                <input
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-center text-lg tracking-[0.4em]"
                />
                <button type="button" onClick={() => void verifyOtp()} className="btn-primary w-full">
                  Verify and sign in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtp('');
                    setWaError('');
                  }}
                  className="w-full text-sm font-semibold text-slate-500"
                >
                  Use a different number
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <label className="block text-sm font-medium text-slate-700">Country</label>
                <select
                  value={countryIso}
                  onChange={(event) => setCountryIso(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                >
                  <optgroup label="Popular">
                    {popularPhoneCountries().map((item) => (
                      <option key={`popular-${item.iso}`} value={item.iso}>
                        {item.name} (+{item.dial})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="All countries">
                    {otherPhoneCountries().map((item) => (
                      <option key={item.iso} value={item.iso}>
                        {item.name} (+{item.dial})
                      </option>
                    ))}
                  </optgroup>
                </select>
                <label className="block text-sm font-medium text-slate-700">WhatsApp number</label>
                <div className="flex overflow-hidden rounded-xl border border-slate-200">
                  <span className="inline-flex min-w-[4.5rem] items-center justify-center border-r border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
                    +{country.dial}
                  </span>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value.replace(/\D/g, ''))}
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="Mobile number"
                    className="h-11 min-w-0 flex-1 px-3 text-sm outline-none"
                  />
                </div>
                <p className="text-xs text-slate-400">Enter the number without the country code. We will send the code to {formatWhatsAppDisplay(phone, country.dial)}.</p>
                <button type="button" onClick={() => void sendOtp()} className="btn-primary w-full">
                  Send OTP
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.5-5.6-5.6S8.9 6.2 12 6.2c1.8 0 3 .7 3.7 1.4l2.5-2.4C16.8 3.7 14.6 2.8 12 2.8 6.9 2.8 2.8 6.9 2.8 12S6.9 21.2 12 21.2c5.3 0 8.8-3.7 8.8-9 0-.6-.1-1-.2-1.5H12Z" />
    </svg>
  );
}
