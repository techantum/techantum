'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';
import PartnerBrandMark from '@/components/partner/PartnerBrandMark';
import AuthSplitShell from '@/components/auth/AuthSplitShell';

function OnboardForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') ?? '';
  const supabase = createClient();

  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{
    contactName: string;
    companyName: string;
    partnerCode: string;
    email: string;
    logoUrl: string | null;
  } | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setValidating(false);
      return;
    }
    fetch(`/api/partner/onboard?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        setValid(data.valid === true);
        if (data.valid) {
          setInviteInfo({
            contactName: data.contactName,
            companyName: data.companyName,
            partnerCode: data.partnerCode,
            email: data.email,
            logoUrl: data.logoUrl ?? null,
          });
        } else {
          setError(data.error || 'Invalid invite link');
        }
      })
      .finally(() => setValidating(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/partner/onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password, confirmPassword }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Failed to set password');
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password,
    });

    if (signInError) {
      router.push('/partner/login?onboarded=1');
      return;
    }

    router.push('/partner/dashboard');
    router.refresh();
  };

  const displayName = inviteInfo?.companyName || 'TechAntum';
  const logo = (
    <span className="inline-flex items-center rounded-2xl bg-white px-4 py-2 shadow-sm ring-1 ring-black/5">
      <PartnerBrandMark logoUrl={inviteInfo?.logoUrl} companyName={displayName} size="md" />
    </span>
  );

  let body: React.ReactNode;
  if (validating) {
    body = (
      <div className="py-12 text-center">
        <Icon name="ArrowPathIcon" size={32} className="mx-auto mb-4 animate-spin text-secondary" />
        <p className="text-slate-500">Validating your invite…</p>
      </div>
    );
  } else if (!token || !valid) {
    body = (
      <div className="py-8 text-center">
        <Icon name="ExclamationTriangleIcon" size={48} className="mx-auto mb-4 text-amber-500" />
        <h2 className="mb-2 font-bricolage text-xl font-bold text-slate-900">Invalid invite link</h2>
        <p className="mb-6 text-sm text-slate-500">
          {error || 'This link may have expired. Ask your TechAntum admin to resend the invite.'}
        </p>
        <Link href="/partner/login" className="text-sm font-medium text-secondary hover:underline">
          Go to partner login
        </Link>
      </div>
    );
  } else {
    body = (
      <>
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-orange-100 bg-orange-50 p-4">
          <span className="flex items-center justify-center rounded-xl bg-white px-3 py-2">
            <PartnerBrandMark logoUrl={inviteInfo?.logoUrl} companyName={inviteInfo?.companyName} size="md" />
          </span>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-secondary">Welcome</p>
            <p className="font-semibold text-slate-900">{inviteInfo?.contactName}</p>
            <p className="text-sm text-slate-600">{inviteInfo?.companyName}</p>
            <p className="mt-2 font-mono text-xs text-slate-500">{inviteInfo?.partnerCode}</p>
          </div>
        </div>

        <h2 className="font-bricolage text-2xl font-bold text-slate-900">Set your password</h2>
        <p className="mt-1 text-sm text-slate-500">Create a secure password to activate your partner portal account.</p>

        {error && (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              type="email"
              readOnly
              value={inviteInfo?.email ?? ''}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-500"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-secondary/40 focus:bg-white focus:ring-2 focus:ring-secondary/15"
              placeholder="Minimum 8 characters"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Confirm password
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-secondary/40 focus:bg-white focus:ring-2 focus:ring-secondary/15"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-secondary py-3.5 text-sm font-semibold text-white hover:bg-secondary/90 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Icon name="ArrowPathIcon" size={18} className="animate-spin" />
                Activating account…
              </>
            ) : (
              <>
                Activate account
                <Icon name="ArrowRightIcon" size={16} />
              </>
            )}
          </button>
        </form>
      </>
    );
  }

  return (
    <AuthSplitShell
      homeHref="/partner/login"
      logo={logo}
      kicker="Partner onboarding"
      title={
        <>
          Activate your <span className="text-secondary">{displayName}</span> workspace
        </>
      }
      subtitle="Set a password with the invite link from TechAntum and start submitting client requirements."
      highlights={[
        { icon: 'KeyIcon', title: 'Set a password', description: 'Choose a secure password to activate this partner account.' },
        { icon: 'ClipboardDocumentListIcon', title: 'Submit briefs', description: 'Capture client requirements with the same plans as techantum.com.' },
        { icon: 'UsersIcon', title: 'Invite your team', description: 'Admins can grant menu access for each teammate.' },
        { icon: 'DocumentTextIcon', title: 'Download documents', description: 'Collect SOWs and proposals as soon as they are ready.' },
      ]}
    >
      <div className="mb-8 lg:hidden">{logo}</div>
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
        {body}
      </div>
    </AuthSplitShell>
  );
}

export default function PartnerOnboardPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-slate-500">Loading…</p>}>
      <OnboardForm />
    </Suspense>
  );
}
