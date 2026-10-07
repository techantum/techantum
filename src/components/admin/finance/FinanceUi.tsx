'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import AdminBadge from '@/components/admin/AdminBadge';
import { formatINR, toCents } from '@/lib/finance/money';

export function FinanceShell({ children }: { children: ReactNode }) {
  return <div className="w-full space-y-5">{children}</div>;
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

export function StatusBadge({ value }: { value?: string | null }) {
  const v = String(value || '').toLowerCase();
  const variant =
    v === 'paid' || v === 'finalized' || v === 'active' || v === 'sent'
      ? 'green'
      : v === 'overdue' || v === 'cancelled' || v === 'reversed'
        ? 'rose'
        : v === 'partially_paid' || v === 'draft'
          ? 'amber'
          : 'indigo';
  const label = v.replace(/_/g, ' ') || '—';
  return <AdminBadge variant={variant}>{label}</AdminBadge>;
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
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between pt-3 text-xs text-slate-500">
      <span>
        {total} record{total === 1 ? '' : 's'}
      </span>
      <div className="flex gap-2">
        <button type="button" className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Prev
        </button>
        <span className="px-1 py-1">
          {page} / {pages}
        </span>
        <button type="button" className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-40" disabled={page >= pages} onClick={() => onPage(page + 1)}>
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
