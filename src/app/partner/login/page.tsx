'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';

export default function PartnerLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

    // Verify partner access
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e1b4b] via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <p className="font-bricolage font-bold text-2xl text-white">TechAntum</p>
            <p className="text-xs uppercase tracking-[0.25em] text-indigo-300 mt-1">Partner Portal</p>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="font-bricolage text-2xl font-bold text-slate-900 mb-1">Partner Sign In</h1>
          <p className="text-sm text-slate-500 mb-6">
            Access your dashboard, requirements, and SOW documents.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex gap-2">
              <Icon name="ExclamationCircleIcon" size={18} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
            <div className="text-right">
              <Link href="/partner/forgot-password" className="text-sm text-indigo-600 hover:underline">
                Forgot password?
              </Link>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold text-sm hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Icon name="ArrowPathIcon" size={18} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-indigo-300 mt-6">
          Need access? Contact{' '}
          <a href="mailto:info@techantum.com" className="underline">
            info@techantum.com
          </a>
        </p>
      </div>
    </div>
  );
}
