'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { emailError, enterPlaceholder } from '@/lib/forms/rules';

export default function EmailCapture({
  id,
  cta = 'Start free trial',
  light = false,
  signedIn = false,
}: {
  id?: string;
  cta?: string;
  light?: boolean;
  signedIn?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const issue = emailError(email);
    if (issue) {
      setError(issue);
      return;
    }
    if (signedIn) {
      router.push('/?buy=1');
      return;
    }
    router.push(`/signup?email=${encodeURIComponent(email.trim())}`);
  }

  const field = (
    <input
      type="email"
      required
      value={email}
      onChange={(event) => { setEmail(event.target.value); setError(''); }}
      placeholder={enterPlaceholder('email')}
      className="h-11 min-w-0 flex-1 bg-transparent px-4 text-sm text-slate-800 outline-none placeholder:text-slate-400"
    />
  );

  if (light) {
    return (
      <form id={id} onSubmit={onSubmit} className="w-full max-w-lg">
        <div className="flex items-center rounded-full bg-white p-1">
          {field}
          <button type="submit" className="btn-primary min-h-11 shrink-0">
            {cta} →
          </button>
        </div>
        {error ? <p className="mt-2 px-4 text-xs text-rose-600">{error}</p> : null}
      </form>
    );
  }

  return (
    <form id={id} onSubmit={onSubmit} className="w-full max-w-[420px]">
      <div className="flex items-center rounded-full bg-white p-1 shadow-[0_14px_40px_rgba(109,40,217,0.12)] ring-1 ring-slate-200">
        {field}
        <button type="submit" className="btn-primary min-h-11 shrink-0">
          {cta}
        </button>
      </div>
      {error ? <p className="mt-2 px-4 text-xs text-rose-600">{error}</p> : null}
    </form>
  );
}
