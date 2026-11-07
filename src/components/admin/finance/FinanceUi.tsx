'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { formatINR, toCents } from '@/lib/finance/money';

export function FinanceShell({ children }: { children: ReactNode }) {
  return <div className="w-full space-y-4">{children}</div>;
}

export function money(value: unknown) {
  try {
    return formatINR(toCents(value));
  } catch {
    return '₹0.00';
  }
}

export function FinanceTh({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <th className={`border-b border-slate-100 bg-slate-50 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400 ${className}`}>
      {children}
    </th>
  );
}

export function FinanceTd({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`border-b border-slate-100 px-3 py-2 align-top text-sm ${className}`}>{children}</td>;
}

export function TypePill({ children }: { children: ReactNode }) {
  return <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">{children}</span>;
}

export function StatusBadge({ value }: { value?: string | null }) {
  const v = String(value || '').toLowerCase();
  const ok = ['paid', 'finalized', 'active', 'sent', 'uploaded', 'enabled'].includes(v);
  const bad = ['overdue', 'cancelled', 'reversed', 'inactive', 'suspended', 'archived'].includes(v);
  const warn = ['partially_paid', 'draft', 'pending', 'unpaid'].includes(v);
  const tone = ok ? 'bg-emerald-50 text-emerald-600' : bad ? 'bg-rose-50 text-rose-600' : warn ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700';
  const label = (v || '—').replace(/_/g, ' ');
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${tone}`}>{label}</span>;
}

export function Pager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const safePage = Math.min(Math.max(1, page), pages);
  const from = total ? (safePage - 1) * pageSize + 1 : 0;
  const to = Math.min(safePage * pageSize, total);
  const windowSize = 5;
  const windowStart = Math.max(1, Math.min(safePage - Math.floor(windowSize / 2), pages - windowSize + 1));
  const windowEnd = Math.min(pages, windowStart + windowSize - 1);
  const pageNumbers = Array.from({ length: Math.max(0, windowEnd - windowStart + 1) }, (_, index) => windowStart + index);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-1 pt-4 text-sm text-slate-500">
      <span>
        Showing {from} to {to} of {total} record{total === 1 ? '' : 's'}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="h-8 rounded-lg px-2.5 hover:bg-slate-50 disabled:opacity-40"
          disabled={safePage <= 1}
          onClick={() => onPage(safePage - 1)}
        >
          Prev
        </button>
        {pageNumbers.map((number) => (
          <button
            key={number}
            type="button"
            className={`h-8 min-w-8 rounded-lg px-2 text-sm ${
              number === safePage ? 'bg-secondary font-semibold text-white' : 'hover:bg-slate-50'
            }`}
            onClick={() => onPage(number)}
          >
            {number}
          </button>
        ))}
        <button
          type="button"
          className="h-8 rounded-lg px-2.5 hover:bg-slate-50 disabled:opacity-40"
          disabled={safePage >= pages}
          onClick={() => onPage(safePage + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function FinanceLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-medium text-secondary hover:underline">
      {children}
    </Link>
  );
}

export const PAYMENT_MODES = ['Bank Transfer', 'UPI', 'Cheque', 'Cash', 'Card', 'Other'];
