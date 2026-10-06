'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';
import PartnerBrandMark from '@/components/partner/PartnerBrandMark';
import AuthSplitShell from '@/components/auth/AuthSplitShell';

type PartnerBranding = {
  company_name: string;
  logo_url: string | null;
  partner_code: string;
};

const STORAGE_KEY = 'ta_partner_branding';

function readStoredBranding(): PartnerBranding | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PartnerBranding;
    if (parsed?.company_name) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function storeBranding(branding: PartnerBranding | null) {
  try {
    if (branding) localStorage.setItem(STORAGE_KEY, JSON.stringify(branding));
  } catch {
    /* ignore */
  }
}

export default function PartnerLoginForm({
  siteLogoUrl,
  siteName,
}: {
  siteLogoUrl?: string | null;
  siteName?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [branding, setBranding] = useState<PartnerBranding | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const code = searchParams?.get('code') || '';

  useEffect(() => {
    const stored = readStoredBranding();
    if (stored) setBranding(stored);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!code && !emailLooksValid) return undefined;

    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (code) params.set('code', code);
        if (emailLooksValid) params.set('email', email.trim().toLowerCase());
        const res = await fetch(`/api/public/partner/branding?${params}`, { signal: controller.signal });
        const data = await res.json();
        if (data.branding) {
          setBranding(data.branding);
          storeBranding(data.branding);
        } else if (!code) {
          setBranding(null);
        }
      } catch {
        /* ignore abort/network */
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [email, code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signInError) {
      setError('Invalid email or password.');
      setLoading(false);
      return;
    }

    const { data: partnerUser } = await supabase
      .from('partner_users')
      .select('id, partner_id, status')
      .eq('user_id', data.user.id)
      .maybeSingle();

    if (!partnerUser || partnerUser.status !== 'active') {
      await supabase.auth.signOut();
      setError(
        partnerUser?.status === 'pending'
          ? 'Please complete onboarding using the invite email link first.'
          : 'Your partner account is not active. Contact TechAntum support.'
      );
      setLoading(false);
      return;
    }

    await supabase
      .from('partner_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', partnerUser.id);

    const postLogin = await fetch('/api/partner/auth/post-login', { method: 'POST' });
    const postData = await postLogin.json();

    if (postData.otpRequired) {
      router.push('/partner/verify-otp');
    } else {
      router.push('/partner/dashboard');
    }
    router.refresh();
  };

  const displayName = branding?.company_name || siteName || 'TechAntum';
  const displayLogo = branding?.logo_url || (!branding ? siteLogoUrl : null);
  const logo = (
    <span className="inline-flex items-center rounded-2xl bg-white px-4 py-2 shadow-sm ring-1 ring-black/5">
      <PartnerBrandMark logoUrl={displayLogo} companyName={displayName} size="md" />
    </span>
  );

  return (
    <AuthSplitShell
      logo={logo}
      kicker="Partner portal"
      title={
        <>
          Welcome back to <span className="text-secondary">{displayName}</span>
        </>
      }
      subtitle="Submit client requirements, manage your team, and download proposals from one workspace."
      highlights={[
        { icon: 'ClipboardDocumentListIcon', title: 'Client requirements', description: 'Capture briefs and track every submission.' },
        { icon: 'UsersIcon', title: 'Team access', description: 'Decide which menus each teammate can open.' },
        { icon: 'DocumentTextIcon', title: 'Documents', description: 'Download SOWs and proposals when they are ready.' },
        { icon: 'MagnifyingGlassCircleIcon', title: 'Lead discovery', description: 'Search and export leads when your account has access.' },
      ]}
    >
      <div className="lg:hidden mb-8">{logo}</div>
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
        <h2 className="font-bricolage text-2xl font-bold text-slate-900">Partner sign in</h2>
        <p className="mt-1 text-sm text-slate-500">Access your dashboard, requirements, and SOW documents.</p>

        {error && (
          <div className="mt-4 flex gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <Icon name="ExclamationCircleIcon" size={18} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-secondary/40 focus:bg-white focus:ring-2 focus:ring-secondary/15"
              placeholder="you@company.com"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <div className="relative mt-1.5">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-12 text-sm outline-none transition focus:border-secondary/40 focus:bg-white focus:ring-2 focus:ring-secondary/15"
                placeholder="••••••••"
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
          <div className="text-right">
            <Link href="/partner/forgot-password" className="text-sm font-medium text-secondary hover:underline">
              Forgot password?
            </Link>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-secondary py-3.5 text-sm font-semibold text-white hover:bg-secondary/90 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Icon name="ArrowPathIcon" size={18} className="animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                Sign in
                <Icon name="ArrowRightIcon" size={16} />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-500">
          Need access? Contact{' '}
          <a href="mailto:info@techantum.com" className="font-semibold text-secondary hover:underline">
            info@techantum.com
          </a>
        </p>
      </div>
    </AuthSplitShell>
  );
}
