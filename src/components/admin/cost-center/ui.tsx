'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { STATUS_LABELS } from '@/lib/cost-center/types';
import { formatMoney, formatPct } from '@/lib/cost-center/calculate';

export function CcShell({ children }: { children: ReactNode }) {
  return <div className="w-full space-y-4">{children}</div>;
}

export function CcBadge({ value }: { value?: string | number | null }) {
  const raw = String(value ?? '');
  const v = raw.toLowerCase();
  const green = ['approved', 'converted', 'active', 'ok'].includes(v);
  const amber = ['estimated', 'draft', 'pending'].includes(v);
  const red = ['archived', 'inactive', 'cancelled'].includes(v);
  const tone = green
    ? 'bg-emerald-50 text-emerald-700'
    : amber
      ? 'bg-amber-50 text-amber-700'
      : red
        ? 'bg-rose-50 text-rose-700'
        : 'bg-sky-50 text-sky-700';
  if (!raw) return <span className="text-slate-400">—</span>;
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${tone}`}>
      {STATUS_LABELS[v] || raw.replaceAll('_', ' ')}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  href?: string;
}) {
  const body = (
    <div
      className={`rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm ${
        href ? 'transition hover:border-secondary/40' : ''
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {action}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

export function Th({ children }: { children?: ReactNode }) {
  return (
    <th className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
      {children}
    </th>
  );
}

export function Td({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`whitespace-nowrap border-b border-slate-100 px-3 py-2 text-sm text-slate-700 ${className}`}>{children}</td>;
}

export const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-secondary';

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      {children}
      {hint ? <span className="block text-[11px] text-slate-400">{hint}</span> : null}
    </label>
  );
}

export function money(value: unknown) {
  return formatMoney(value);
}

export function pct(value: unknown) {
  return formatPct(value);
}
