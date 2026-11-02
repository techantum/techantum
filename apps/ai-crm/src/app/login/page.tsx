'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@aicrm.local');
  const [password, setPassword] = useState('Admin@12345');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Login failed');
      router.push('/overview');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#0b1220]">
      <div className="relative hidden w-[42%] overflow-hidden lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(109,40,217,0.45),transparent_45%),radial-gradient(circle_at_80%_60%,rgba(14,165,233,0.25),transparent_40%)]" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-300">AI CRM</div>
            <h1 className="mt-4 text-4xl font-semibold leading-tight">AI Lead CRM</h1>
            <p className="mt-3 max-w-sm text-sm text-slate-300">
              Lead capture, WhatsApp qualification, AI calling, and sales follow-up.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            Workspace-isolated records · Provider adapters for WhatsApp, voice, and CRM sync
          </div>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center bg-[#f3f4f6] px-4">
        <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Sign in</div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">AI Lead CRM</h2>
          <p className="mt-1 text-sm text-slate-500">Workspace sign in</p>

          <label className="mt-6 block text-sm font-medium text-slate-700">
            Email
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none ring-secondary/20 focus:ring"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </label>
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Password
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none ring-secondary/20 focus:ring"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </label>

          {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

          <button
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-secondary px-4 py-2.5 font-medium text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
