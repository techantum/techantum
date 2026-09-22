'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import AdminBadge from '@/components/admin/AdminBadge';
import { OpsPageShell, OpsTd, OpsTh } from '@/components/admin/ops/OpsUi';

export function ProviderShell({ children }: { children: ReactNode }) {
  return <OpsPageShell>{children}</OpsPageShell>;
}

export function StatusPill({ value }: { value?: string | null }) {
  const key = (value || 'UNKNOWN').toUpperCase();
  const variant =
    ['HEALTHY', 'ACTIVE', 'APPROVED', 'META_APPROVED', 'GREEN', 'PROCESSED', 'SUCCESS', 'CONNECTED', 'RESOLVED', 'READ', 'DELIVERED'].includes(key)
      ? 'green'
      : ['WARNING', 'ATTENTION', 'PENDING', 'YELLOW', 'META_PENDING', 'INTERNAL_REVIEW', 'ACKNOWLEDGED', 'SENT'].includes(key)
        ? 'amber'
        : ['CRITICAL', 'FAILED', 'REJECTED', 'META_REJECTED', 'RED', 'DISABLED', 'SUSPENDED'].includes(key)
          ? 'rose'
          : ['INFORMATION', 'PROCESSING', 'RECEIVED', 'OPEN'].includes(key)
            ? 'sky'
            : 'default';
  return <AdminBadge variant={variant}>{key.replace(/_/g, ' ')}</AdminBadge>;
}

export function ProviderTable({
  columns,
  rows,
  empty,
  loading,
  error,
}: {
  columns: string[];
  rows: ReactNode[];
  empty?: string;
  loading?: boolean;
  error?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr>
            {columns.map((col) => (
              <OpsTh key={col}>{col}</OpsTh>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-slate-500">
                Loading…
              </td>
            </tr>
          ) : rows.length ? (
            rows
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-slate-500">
                {error || empty || 'No records yet.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <OpsTd className={className}>{children}</OpsTd>;
}

export function when(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function ProviderLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-medium text-indigo-700 hover:underline">
      {children}
    </Link>
  );
}
