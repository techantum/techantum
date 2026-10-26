'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export default function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const search = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState(search.get('email') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const signup = mode === 'signup';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch(signup ? '/api/auth/signup' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signup ? { name, email, password } : { email, password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || (signup ? 'Could not create the account' : 'Could not sign in'));
      window.location.assign('/youtube');
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-fuchsia-100 bg-white p-8 shadow-[0_24px_80px_rgba(168,85,247,0.12)]">
      <p className="font-bricolage text-3xl font-bold tracking-tight text-slate-900">{signup ? 'Start your trial' : 'Sign in'}</p>
      <p className="mt-2 text-sm text-slate-500">
        {signup
          ? '14 days of Growth: YouTube research and lead discovery. No card required.'
          : 'Use your Revealeo email and password to open your workspace.'}
      </p>
      {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {signup ? (
        <label className="mt-6 block text-sm font-medium text-slate-700">
          Workspace name
          <input
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-100"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
      ) : null}
      <label className={`${signup ? 'mt-3' : 'mt-6'} block text-sm font-medium text-slate-700`}>
        Email
        <input
          className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-100"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label className="mt-3 block text-sm font-medium text-slate-700">
        Password
        <input
          className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-100"
          type="password"
          autoComplete={signup ? 'new-password' : 'current-password'}
          minLength={signup ? 8 : undefined}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="mt-6 w-full rounded-full bg-fuchsia-600 py-3 text-sm font-semibold text-white hover:bg-fuchsia-500 disabled:opacity-50"
      >
        {busy ? (signup ? 'Creating…' : 'Signing in…') : signup ? 'Get started' : 'Sign in'}
      </button>
      <p className="mt-4 text-center text-sm text-slate-500">
        {signup ? (
          <>
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-fuchsia-700">
              Sign in
            </Link>
          </>
        ) : (
          <>
            No account?{' '}
            <Link href="/signup" className="font-semibold text-fuchsia-700">
              Get started
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
