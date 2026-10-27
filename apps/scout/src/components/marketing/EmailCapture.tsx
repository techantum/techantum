'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export default function EmailCapture({
  id,
  cta = 'Start free trial',
  light = false,
}: {
  id?: string;
  cta?: string;
  light?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next = email.trim() ? `/signup?email=${encodeURIComponent(email.trim())}` : '/signup';
    router.push(next);
  }

  if (light) {
    return (
      <form id={id} onSubmit={onSubmit} className="flex w-full max-w-lg items-center rounded-full bg-white p-1">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Enter email"
          className="h-11 min-w-0 flex-1 bg-transparent px-4 text-sm text-slate-800 outline-none placeholder:text-slate-400"
        />
        <button type="submit" className="inline-flex h-11 shrink-0 items-center gap-1 rounded-full bg-[#7C3AED] px-4 text-sm font-semibold text-white hover:bg-[#6D28D9]">
          {cta} →
        </button>
      </form>
    );
  }

  return (
    <form id={id} onSubmit={onSubmit} className="flex w-full max-w-[420px] items-center rounded-full bg-white p-1 shadow-[0_14px_40px_rgba(109,40,217,0.12)] ring-1 ring-slate-200">
      <input
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Enter email"
        className="h-11 min-w-0 flex-1 bg-transparent px-4 text-sm text-slate-800 outline-none placeholder:text-slate-400"
      />
      <button type="submit" className="inline-flex h-11 shrink-0 items-center rounded-full bg-[#6D28D9] px-4 text-sm font-semibold text-white hover:bg-[#5B21B6]">
        {cta}
      </button>
    </form>
  );
}
