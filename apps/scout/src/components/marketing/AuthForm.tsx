'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { EmailField, NameField, PasswordField } from '@/components/ui/FormFields';
import { useProcess } from '@/components/ui/ProcessOverlay';
import { emailError, isStrongPassword, nameError } from '@/lib/forms/rules';

export default function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const search = useSearchParams();
  const overlay = useProcess();
  const [name, setName] = useState('');
  const [email, setEmail] = useState(search.get('email') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);
  const signup = mode === 'signup';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setShowError(true);
    if (signup && nameError(name, 'workspace name')) {
      setError(nameError(name, 'workspace name'));
      return;
    }
    if (emailError(email)) {
      setError(emailError(email));
      return;
    }
    if (signup && !isStrongPassword(password)) {
      setError('Enter a password that meets all the conditions.');
      return;
    }
    if (!signup && !password) {
      setError('Enter password.');
      return;
    }
    setError('');
    await overlay.run(signup ? 'Creating your account…' : 'Signing in…', async () => {
      try {
        const response = await fetch(signup ? '/api/auth/signup' : '/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(signup ? { name, email, password } : { email, password }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || (signup ? 'Could not create the account' : 'Could not sign in'));
        window.location.assign('/youtube');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
    });
  };

  return (
    <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-fuchsia-100 bg-white p-8 shadow-[0_24px_80px_rgba(168,85,247,0.12)]">
      <p className="font-bricolage text-3xl font-bold tracking-tight text-slate-900">{signup ? 'Start your trial' : 'Sign in'}</p>
      <p className="mt-2 text-sm text-slate-500">
        {signup
          ? '14 days of Growth: YouTube research and lead discovery. No card required.'
          : 'Use your Hookooh email and password to open your workspace.'}
      </p>
      {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {signup ? (
        <div className="mt-6">
          <NameField label="Workspace name" value={name} onValue={setName} showError={showError} />
        </div>
      ) : null}
      <div className={signup ? 'mt-3' : 'mt-6'}>
        <EmailField value={email} onValue={setEmail} showError={showError} />
      </div>
      <div className="mt-3">
        <PasswordField
          value={password}
          onValue={setPassword}
          showError={showError}
          showRules={signup}
          autoComplete={signup ? 'new-password' : 'current-password'}
        />
      </div>
      <button type="submit" className="btn-primary mt-6 w-full">
        {signup ? 'Get started' : 'Sign in'}
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
