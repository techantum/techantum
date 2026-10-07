'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import PartnerBrandMark from '@/components/partner/PartnerBrandMark';
import AuthSplitShell from '@/components/auth/AuthSplitShell';

function VerifyOtpForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [branding, setBranding] = useState<{ company_name: string; logo_url: string | null } | null>(null);

  useEffect(() => {
    fetch('/api/partner/logo')
      .then((r) => r.json())
      .then((data) => {
        if (data.company_name) setBranding({ company_name: data.company_name, logo_url: data.logo_url ?? null });
      })
      .catch(() => undefined);
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/partner/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Verification failed');
      return;
    }

    router.push('/partner/dashboard');
    router.refresh();
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    setMessage('');
    const res = await fetch('/api/partner/auth/verify-otp', { method: 'PUT' });
    const data = await res.json();
    setResending(false);
    if (!res.ok) {
      setError(data.error || 'Failed to resend');
      return;
    }
    setMessage('A new code has been sent to your email.');
  };

  const displayName = branding?.company_name || 'TechAntum';
  const logo = (
    <span className="inline-flex items-center rounded-2xl bg-white px-4 py-2 shadow-sm ring-1 ring-black/5">
      <PartnerBrandMark logoUrl={branding?.logo_url} companyName={displayName} size="md" />
    </span>
  );

  return (
    <AuthSplitShell
      homeHref="/partner/login"
      logo={logo}
      kicker="Partner portal"
      title={
        <>
          Confirm it&apos;s you to enter <span className="text-secondary">{displayName}</span>
        </>
      }
      subtitle="Enter the 6-digit code sent to your email to finish signing in."
      highlights={[
        { icon: 'ShieldCheckIcon', title: 'Secure access', description: 'A one-time code keeps your partner workspace private.' },
        { icon: 'EnvelopeIcon', title: 'Sent to email', description: 'Check your inbox and spam folder for the latest code.' },
        { icon: 'ClockIcon', title: 'Expires quickly', description: 'Request a new code if the previous one has timed out.' },
        { icon: 'Squares2X2Icon', title: 'Then dashboard', description: 'Continue to requirements, documents, and team tools.' },
      ]}
    >
      <div className="mb-8 lg:hidden">{logo}</div>
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
        <h2 className="font-bricolage text-2xl font-bold text-slate-900">Verify your email</h2>
        <p className="mt-1 text-sm text-slate-500">Enter the 6-digit code sent to your email to complete sign-in.</p>

        {error && (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}
        {message && (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </p>
        )}

        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Verification code
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-center font-mono text-2xl tracking-[0.5em] outline-none transition focus:border-secondary/40 focus:bg-white focus:ring-2 focus:ring-secondary/15"
              placeholder="000000"
            />
          </label>
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-secondary py-3.5 text-sm font-semibold text-white hover:bg-secondary/90 disabled:opacity-60"
          >
            {loading ? 'Verifying…' : 'Verify & continue'}
            <Icon name="ArrowRightIcon" size={16} />
          </button>
        </form>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="mt-4 w-full text-sm font-medium text-secondary hover:underline disabled:opacity-50"
        >
          {resending ? 'Sending…' : 'Resend code'}
        </button>
        <Link href="/partner/login" className="mt-4 block text-center text-sm text-slate-500 hover:text-secondary">
          Back to sign in
        </Link>
      </div>
    </AuthSplitShell>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-slate-500">Loading…</p>}>
      <VerifyOtpForm />
    </Suspense>
  );
}
