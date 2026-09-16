import Icon from '@/components/ui/AppIcon';

interface AdminStatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  accent?: 'default' | 'amber' | 'blue' | 'green' | 'violet' | 'rose';
  icon?: string;
}

const accentStyles = {
  default: {
    value: 'text-slate-900',
    bg: 'from-white via-slate-50 to-indigo-50 border-indigo-100',
    icon: 'bg-gradient-to-br from-slate-600 to-indigo-600 text-white',
    glow: 'shadow-slate-200/80',
  },
  amber: {
    value: 'text-amber-800',
    bg: 'from-amber-50 via-white to-orange-50 border-amber-100',
    icon: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white',
    glow: 'shadow-amber-200/70',
  },
  blue: {
    value: 'text-sky-800',
    bg: 'from-sky-50 via-white to-cyan-50 border-sky-100',
    icon: 'bg-gradient-to-br from-sky-500 to-cyan-500 text-white',
    glow: 'shadow-sky-200/70',
  },
  green: {
    value: 'text-emerald-800',
    bg: 'from-emerald-50 via-white to-teal-50 border-emerald-100',
    icon: 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white',
    glow: 'shadow-emerald-200/70',
  },
  violet: {
    value: 'text-violet-800',
    bg: 'from-violet-50 via-white to-fuchsia-50 border-violet-100',
    icon: 'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white',
    glow: 'shadow-violet-200/70',
  },
  rose: {
    value: 'text-rose-800',
    bg: 'from-rose-50 via-white to-orange-50 border-rose-100',
    icon: 'bg-gradient-to-br from-rose-500 to-orange-500 text-white',
    glow: 'shadow-rose-200/70',
  },
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
    <div
      className={`rounded-3xl border bg-gradient-to-br ${styles.bg} p-4 shadow-md ${styles.glow} hover:-translate-y-0.5 hover:shadow-lg transition-all`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className={`text-2xl sm:text-3xl font-bold mt-1 ${styles.value}`}>{value}</p>
          {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
        </div>
        {icon && (
          <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${styles.icon}`}>
            <Icon name={icon} size={20} />
          </div>
        )}
      </div>
    </div>
  );
}
