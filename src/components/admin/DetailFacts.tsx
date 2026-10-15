import type { ReactNode } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

export function AdminBackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:underline">
      <Icon name="ArrowLeftIcon" size={14} />
      {children}
    </Link>
  );
}

export function FactGrid({ children, cols = 3 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  const columns =
    cols === 4 ? 'sm:grid-cols-2 xl:grid-cols-4' : cols === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3';
  return <div className={`grid grid-cols-1 gap-x-8 gap-y-4 ${columns}`}>{children}</div>;
}

export function Fact({ icon, label, children }: { icon?: string; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      {icon && <Icon name={icon} size={16} className="mt-0.5 shrink-0 text-slate-400" />}
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <div className="mt-0.5 text-sm font-medium text-slate-800">{children}</div>
      </div>
    </div>
  );
}

export function SectionEmpty({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-8 text-center">
      <Icon name={icon} size={28} className="text-slate-300" />
      <p className="mt-2 text-sm font-medium text-slate-600">{title}</p>
      <p className="mt-0.5 text-xs text-slate-400">{description}</p>
    </div>
  );
}
