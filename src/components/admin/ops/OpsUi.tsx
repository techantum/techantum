'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import AdminBadge from '@/components/admin/AdminBadge';

export function formatOpsWhen(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function OpsOverviewField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
      <div className="text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}

export function OpsTimelineItem({ title, meta, body }: { title: string; meta: string; body?: string }) {
  return (
    <div className="relative pl-4 pb-3 last:pb-0 border-l-2 border-indigo-100 last:border-transparent">
      <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-indigo-500 ring-4 ring-indigo-50" />
      <p className="text-sm font-medium text-foreground leading-snug">{title}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{meta}</p>
      {body && <p className="text-[11px] text-muted-foreground mt-1 italic">{body}</p>}
    </div>
  );
}

export function InternalEstimationGrid({
  hours,
  rate,
  developers,
  cost,
}: {
  hours: number | string;
  rate: number | string;
  developers: number | string;
  cost: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-lg bg-amber-50/50 border border-amber-100 p-3 text-center">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Hours</p>
        <p className="text-xl font-bold text-amber-800 mt-0.5">{hours}</p>
      </div>
      <div className="rounded-lg bg-amber-50/50 border border-amber-100 p-3 text-center">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Developers</p>
        <p className="text-xl font-bold text-amber-800 mt-0.5">{developers}</p>
      </div>
      <div className="rounded-lg bg-white border border-border p-3 text-center">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rate / hr</p>
        <p className="text-base font-semibold mt-0.5">₹{Number(rate).toLocaleString('en-IN')}</p>
      </div>
      <div className="rounded-lg bg-white border border-border p-3 text-center">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Internal cost</p>
        <p className="text-base font-semibold mt-0.5">₹{cost.toLocaleString('en-IN')}</p>
      </div>
    </div>
  );
}

export function OpsCompactTable({ children, empty }: { children: ReactNode; empty?: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">{children}</table>
      {empty && <p className="text-sm text-muted-foreground py-4 text-center">{empty}</p>}
    </div>
  );
}

export function OpsTh({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <th className={`py-2 px-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 border-b border-border ${className}`}>
      {children}
    </th>
  );
}

export function OpsTd({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`py-2 px-3 align-top border-b border-border/50 ${className}`}>{children}</td>;
}

export function OpsLinkedItem({
  href,
  code,
  title,
  badge,
  extra,
}: {
  href: string;
  code?: string;
  title: string;
  badge?: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2 py-2 border-b border-border/50 last:border-0">
      <Link href={href} className="text-sm text-indigo-600 hover:underline min-w-0">
        {code && <span className="font-mono text-[11px] text-muted-foreground mr-1.5">{code}</span>}
        <span className="font-medium">{title}</span>
      </Link>
      <div className="shrink-0 flex items-center gap-1.5">
        {badge}
        {extra}
      </div>
    </div>
  );
}

export function OpsBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
      <Icon name="ArrowLeftIcon" size={14} />
      {label}
    </Link>
  );
}

export function OpsPageShell({ children }: { children: ReactNode }) {
  return <div className="space-y-4 max-w-6xl">{children}</div>;
}

export function OpsGrid({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 ${className}`}>{children}</div>;
}

export function OpsGridSpan({ children }: { children: ReactNode }) {
  return <div className="lg:col-span-2">{children}</div>;
}

export function OpsStatusBadge({ label, overdue }: { label: string; overdue?: boolean }) {
  return (
    <>
      <AdminBadge variant={overdue ? 'rose' : 'indigo'}>{label}</AdminBadge>
      {overdue && <span className="text-[10px] font-semibold text-rose-700 ml-1">Overdue</span>}
    </>
  );
}
