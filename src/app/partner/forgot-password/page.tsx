'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import PartnerBrandMark from '@/components/partner/PartnerBrandMark';
import AuthSplitShell from '@/components/auth/AuthSplitShell';

export default function PartnerForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [branding, setBranding] = useState<{ company_name: string; logo_url: string | null } | null>(null);

  useEffect(() => {
    const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!emailLooksValid) return undefined;
    const timer = window.setTimeout(() => {
      fetch(`/api/public/partner/branding?email=${encodeURIComponent(email.trim().toLowerCase())}`)
        .then((r) => r.json())
        .then((data) => setBranding(data.branding ?? null))
        .catch(() => undefined);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/partner/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Request failed');
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  const displayName = branding?.company_name || 'Partner portal';
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
          Reset access to <span className="text-secondary">{displayName}</span>
        </>
      }
      subtitle="Enter your partner email and we’ll send a reset link if an account exists."
      highlights={[
        { icon: 'EnvelopeIcon', title: 'Email link', description: 'A reset link is sent only to a registered partner inbox.' },
        { icon: 'LockClosedIcon', title: 'Choose a new password', description: 'Set a new password and sign back in to the workspace.' },
        { icon: 'ShieldCheckIcon', title: 'Account stays private', description: 'We never reveal whether an email is registered.' },
        { icon: 'LifebuoyIcon', title: 'Need help?', description: 'Contact info@techantum.com if the link does not arrive.' },
      ]}
    >
      <div className="mb-8 lg:hidden">{logo}</div>
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
        <h2 className="font-bricolage text-2xl font-bold text-slate-900">Reset password</h2>
        <p className="mt-1 text-sm text-slate-500">Enter your partner email and we’ll send a reset link.</p>

        {sent ? (
          <div className="py-6 text-center">
            <Icon name="CheckCircleIcon" size={48} className="mx-auto mb-4 text-emerald-500" variant="solid" />
            <p className="mb-4 text-slate-700">If an account exists for that email, a reset link has been sent.</p>
            <Link href="/partner/login" className="text-sm font-medium text-secondary hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
            )}
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-secondary/40 focus:bg-white focus:ring-2 focus:ring-secondary/15"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-secondary py-3.5 text-sm font-semibold text-white hover:bg-secondary/90 disabled:opacity-60"
            >
              {loading ? 'Sending…' : 'Send reset link'}
              <Icon name="ArrowRightIcon" size={16} />
            </button>
            <Link href="/partner/login" className="block text-center text-sm font-medium text-secondary hover:underline">
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </AuthSplitShell>
  );
}
