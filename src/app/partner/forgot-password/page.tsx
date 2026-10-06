'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import PartnerBrandMark from '@/components/partner/PartnerBrandMark';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e1b4b] via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/partner/login" className="inline-flex flex-col items-center">
            <span className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 shadow-lg">
              <PartnerBrandMark logoUrl={branding?.logo_url} companyName={branding?.company_name || 'Partner'} size="lg" />
            </span>
            <p className="font-bricolage font-bold text-xl text-white mt-4">{branding?.company_name || 'Partner Portal'}</p>
            <p className="text-xs uppercase tracking-[0.25em] text-indigo-300 mt-1">Reset Password</p>
          </Link>
        </div>
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <h1 className="font-bricolage text-2xl font-bold text-slate-900 mb-1">Reset Password</h1>
        <p className="text-sm text-slate-500 mb-6">
          Enter your partner email and we&apos;ll send a reset link.
        </p>

        {sent ? (
          <div className="text-center py-4">
            <Icon name="CheckCircleIcon" size={48} className="text-green-500 mx-auto mb-4" variant="solid" />
            <p className="text-slate-700 mb-4">
              If an account exists for that email, a reset link has been sent.
            </p>
            <Link href="/partner/login" className="text-indigo-600 hover:underline text-sm">
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold text-sm hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
            <Link href="/partner/login" className="block text-center text-sm text-indigo-600 hover:underline">
              Back to Sign In
            </Link>
          </form>
        )}
      </div>
      </div>
    </div>
  );
}
