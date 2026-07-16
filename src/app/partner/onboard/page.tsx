'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';

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

  if (validating) {
    return (
      <div className="text-center py-12">
        <Icon name="ArrowPathIcon" size={32} className="animate-spin text-indigo-600 mx-auto mb-4" />
        <p className="text-slate-500">Validating your invite…</p>
      </div>
    );
  }

  if (!token || !valid) {
    return (
      <div className="text-center py-8">
        <Icon name="ExclamationTriangleIcon" size={48} className="text-amber-500 mx-auto mb-4" />
        <h2 className="font-bricolage text-xl font-bold text-slate-900 mb-2">Invalid Invite Link</h2>
        <p className="text-slate-500 text-sm mb-6">
          {error || 'This link may have expired. Ask your TechAntum admin to resend the invite.'}
        </p>
        <Link href="/partner/login" className="text-indigo-600 hover:underline text-sm">
          Go to Partner Login
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="bg-indigo-50 rounded-xl p-4 mb-6">
        <p className="text-xs uppercase tracking-wider text-indigo-600 mb-1">Welcome</p>
        <p className="font-semibold text-slate-900">{inviteInfo?.contactName}</p>
        <p className="text-sm text-slate-600">{inviteInfo?.companyName}</p>
        <p className="font-mono text-xs text-indigo-700 mt-2">{inviteInfo?.partnerCode}</p>
      </div>

      <h1 className="font-bricolage text-2xl font-bold text-slate-900 mb-1">Set Your Password</h1>
      <p className="text-sm text-slate-500 mb-6">
        Create a secure password to activate your Partner Portal account.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            type="email"
            readOnly
            value={inviteInfo?.email ?? ''}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500"
            placeholder="Minimum 8 characters"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password *</label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold text-sm hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Icon name="ArrowPathIcon" size={18} className="animate-spin" />
              Activating account…
            </>
          ) : (
            'Activate Account & Enter Portal'
          )}
        </button>
      </form>
    </>
  );
}

export default function PartnerOnboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e1b4b] via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="font-bricolage font-bold text-2xl text-white">TechAntum</p>
          <p className="text-xs uppercase tracking-[0.25em] text-indigo-300 mt-1">Partner Onboarding</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <Suspense
            fallback={
              <div className="text-center py-8 text-slate-500">Loading…</div>
            }
          >
            <OnboardForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
