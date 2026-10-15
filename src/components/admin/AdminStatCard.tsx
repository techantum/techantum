import type { ReactNode } from 'react';
import Icon from '@/components/ui/AppIcon';

interface AdminStatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: 'default' | 'amber' | 'blue' | 'green' | 'violet' | 'rose';
  icon?: string;
}

const accentStyles = {
  default: { bg: 'bg-white', icon: 'bg-slate-100 text-slate-500' },
  amber: { bg: 'bg-amber-50/80', icon: 'bg-amber-100 text-amber-600' },
  blue: { bg: 'bg-sky-50/80', icon: 'bg-sky-100 text-sky-600' },
  green: { bg: 'bg-emerald-50/80', icon: 'bg-emerald-100 text-emerald-600' },
  violet: { bg: 'bg-white', icon: 'bg-slate-100 text-slate-600' },
  rose: { bg: 'bg-rose-50/80', icon: 'bg-rose-100 text-rose-600' },
};

export default function AdminStatCard({
  label,
  value,
  hint,
  accent = 'default',
  icon,
}: AdminStatCardProps) {
  const styles = accentStyles[accent];

  return (
    <div className={`flex h-full items-center justify-between gap-3 rounded-2xl border border-slate-200 ${styles.bg} px-4 py-3.5 shadow-sm`}>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <div className="mt-1 font-bricolage text-xl font-bold text-slate-900">{value}</div>
        {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      </div>
      {icon && (
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${styles.icon}`}>
          <Icon name={icon} size={18} />
        </div>
      )}
    </div>
  );
}
