'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

function VerifyOtpForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

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
          <h1 className="font-bricolage text-2xl font-bold text-slate-900 mb-1">Verify Your Email</h1>
          <p className="text-sm text-slate-500 mb-6">
            Enter the 6-digit code sent to your email to complete sign-in.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              {message}
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 text-center text-2xl tracking-[0.5em] font-mono focus:ring-2 focus:ring-indigo-500"
                placeholder="000000"
              />
            </div>
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold text-sm hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? 'Verifying…' : 'Verify & Continue'}
            </button>
          </form>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="w-full mt-4 text-sm text-indigo-600 hover:underline disabled:opacity-50"
          >
            {resending ? 'Sending…' : 'Resend code'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<p className="text-white text-center p-8">Loading…</p>}>
      <VerifyOtpForm />
    </Suspense>
  );
}
