import Icon from '@/components/ui/AppIcon';

interface AdminStatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  accent?: 'default' | 'amber' | 'blue' | 'green' | 'violet' | 'rose';
  icon?: string;
}

const accentStyles = {
  default: { value: 'text-slate-900', bg: 'bg-white', icon: 'bg-secondary text-white' },
  amber: { value: 'text-slate-900', bg: 'bg-amber-50/70', icon: 'bg-amber-500 text-white' },
  blue: { value: 'text-slate-900', bg: 'bg-sky-50/70', icon: 'bg-sky-500 text-white' },
  green: { value: 'text-slate-900', bg: 'bg-emerald-50/70', icon: 'bg-emerald-500 text-white' },
  violet: { value: 'text-slate-900', bg: 'bg-white', icon: 'bg-slate-900 text-white' },
  rose: { value: 'text-slate-900', bg: 'bg-rose-50/70', icon: 'bg-rose-500 text-white' },
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
    <div className={`rounded-2xl border border-slate-200 ${styles.bg} p-4 shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className={`mt-1 font-bricolage text-2xl font-bold sm:text-3xl ${styles.value}`}>{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
        {icon && (
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${styles.icon}`}>
            <Icon name={icon} size={20} />
          </div>
        )}
      </div>
    </div>
  );
}
