'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';
import AuthSplitShell from '@/components/auth/AuthSplitShell';
import type { SiteBranding } from '@/lib/cms/types';

const HIGHLIGHTS = [
  { icon: 'PaintBrushIcon', title: 'Brand and content', description: 'Update logos, pages, and SEO in one workspace.' },
  { icon: 'InboxIcon', title: 'Leads and analytics', description: 'Follow up on enquiries and watch site traffic.' },
  { icon: 'ChatBubbleLeftRightIcon', title: 'WhatsApp and ops', description: 'Run campaigns, tickets, and client work.' },
  { icon: 'UserGroupIcon', title: 'Partners and teams', description: 'Grant access and keep every role in its lane.' },
];

export default function AdminLoginForm({
  needsSetup,
  branding,
}: {
  needsSetup?: boolean;
  branding?: Pick<SiteBranding, 'logo_url' | 'company_name' | 'logo_letter'>;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupMode, setSetupMode] = useState(needsSetup ?? false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (setupMode) {
        const res = await fetch('/api/admin/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Setup failed');
      }

      const localRes = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (localRes.ok) {
        router.push('/admin');
        router.refresh();
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        const localPayload = (await localRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(localPayload?.error || signInError.message);
      }

      router.push('/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const companyName = branding?.company_name || 'TechAntum';
  const logo = branding?.logo_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={branding.logo_url} alt={companyName} className="h-12 w-auto object-contain" />
  ) : (
    <span className="font-bricolage text-2xl font-bold text-slate-900">{companyName}</span>
  );

  return (
    <AuthSplitShell
      logo={logo}
      kicker="Admin workspace"
      title={
        <>
          Sign in to manage <span className="text-secondary">{companyName}</span>
        </>
      }
      subtitle="Content, leads, WhatsApp, partners, and operations — with access based on your admin role."
      highlights={HIGHLIGHTS}
    >
      <div className="lg:hidden mb-8">{logo}</div>
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
        <h2 className="font-bricolage text-2xl font-bold text-slate-900">
          {setupMode ? 'Create admin account' : 'Admin sign in'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {setupMode
            ? 'Set up the first administrator for this workspace.'
            : 'Use your admin email and password to continue.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-secondary/40 focus:bg-white focus:ring-2 focus:ring-secondary/15"
              placeholder="you@techantum.com"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <div className="relative mt-1.5">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-12 text-sm outline-none transition focus:border-secondary/40 focus:bg-white focus:ring-2 focus:ring-secondary/15"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-3 text-slate-400 hover:text-slate-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <Icon name={showPassword ? 'EyeSlashIcon' : 'EyeIcon'} size={18} />
              </button>
            </div>
          </label>
          {error && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-secondary py-3.5 text-sm font-semibold text-white hover:bg-secondary/90 disabled:opacity-60"
          >
            {loading ? 'Please wait…' : setupMode ? 'Create & sign in' : 'Sign in'}
            <Icon name="ArrowRightIcon" size={16} />
          </button>
        </form>

        {!needsSetup && (
          <button
            type="button"
            onClick={() => setSetupMode((v) => !v)}
            className="mt-4 text-sm text-slate-500 hover:text-secondary"
          >
            {setupMode ? 'Already have an account? Sign in' : 'First time? Create admin account'}
          </button>
        )}

        <p className="mt-6 text-sm text-slate-500">
          Looking for the client or partner portal?{' '}
          <Link href="/login" className="font-semibold text-secondary hover:underline">
            Client login
          </Link>
          {' · '}
          <Link href="/partner/login" className="font-semibold text-secondary hover:underline">
            Partner login
          </Link>
        </p>
      </div>
    </AuthSplitShell>
  );
}
