'use client';

import { ReactNode } from 'react';

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-card ${className}`}>{children}</div>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'default' | 'hot' | 'ok' | 'warn';
}) {
  const bar =
    tone === 'hot' ? 'bg-rose-500' : tone === 'ok' ? 'bg-emerald-500' : tone === 'warn' ? 'bg-amber-500' : 'bg-secondary';
  return (
    <Card className="relative overflow-hidden p-4">
      <div className={`absolute inset-y-0 left-0 w-1 ${bar}`} />
      <div className="pl-2">
        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
        <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{value}</div>
        {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
      </div>
    </Card>
  );
}

export function Badge({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: 'slate' | 'purple' | 'green' | 'amber' | 'rose' | 'sky' | 'orange';
}) {
  const map = {
    slate: 'bg-slate-100 text-slate-700',
    purple: 'bg-violet-100 text-violet-700',
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-800',
    rose: 'bg-rose-100 text-rose-700',
    sky: 'bg-sky-100 text-sky-700',
    orange: 'bg-orange-100 text-orange-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${map[tone]}`}>
      {children}
    </span>
  );
}

export function DemoBanner({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
      {children}
    </div>
  );
}

export function WarnBanner({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {children}
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-3xl text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Tabs({
  items,
  value,
  onChange,
}: {
  items: Array<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200">
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
              active
                ? 'border-secondary font-medium text-secondary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function Btn({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}) {
  const styles = {
    primary: 'bg-secondary text-white hover:bg-violet-700',
    secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-secondary/20 focus:ring';

export function Modal({
  title,
  children,
  onClose,
  wide,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className={`max-h-[90vh] w-full overflow-auto rounded-2xl bg-white shadow-xl ${wide ? 'max-w-3xl' : 'max-w-lg'}`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="text-lg font-semibold text-slate-800">{title}</div>
      {body ? <p className="mt-2 max-w-md text-sm text-slate-500">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </Card>
  );
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  );
}

export function maskPhone(phone?: string | null) {
  if (!phone) return '—';
  const d = phone.replace(/\D/g, '');
  if (d.length < 6) return phone;
  return `+${d.slice(0, 2)} ${d.slice(2, 4)}•••••${d.slice(-3)}`;
}

export function maskEmail(email?: string | null) {
  if (!email) return '—';
  const [u, d] = email.split('@');
  if (!d) return email;
  return `${u.slice(0, 1)}.${u.slice(1, 4) || ''}@•••.${d.split('.').pop()}`;
}
