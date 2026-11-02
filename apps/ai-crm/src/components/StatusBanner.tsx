'use client';

import { ReactNode } from 'react';

/** Operational status only — never used for fabricated metrics. */
export function StatusBanner({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'warn' | 'ok';
  children: ReactNode;
}) {
  const cls =
    tone === 'warn'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : tone === 'ok'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
        : 'border-slate-200 bg-slate-50 text-slate-700';
  return <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${cls}`}>{children}</div>;
}
