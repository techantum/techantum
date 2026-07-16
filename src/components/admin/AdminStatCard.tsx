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
    value: 'text-foreground',
    bg: 'from-slate-50 to-white border-border',
    icon: 'bg-slate-100 text-slate-600',
  },
  amber: {
    value: 'text-amber-700',
    bg: 'from-amber-50/80 to-white border-amber-100',
    icon: 'bg-amber-100 text-amber-700',
  },
  blue: {
    value: 'text-blue-700',
    bg: 'from-blue-50/80 to-white border-blue-100',
    icon: 'bg-blue-100 text-blue-700',
  },
  green: {
    value: 'text-emerald-700',
    bg: 'from-emerald-50/80 to-white border-emerald-100',
    icon: 'bg-emerald-100 text-emerald-700',
  },
  violet: {
    value: 'text-violet-700',
    bg: 'from-violet-50/80 to-white border-violet-100',
    icon: 'bg-violet-100 text-violet-700',
  },
  rose: {
    value: 'text-rose-700',
    bg: 'from-rose-50/80 to-white border-rose-100',
    icon: 'bg-rose-100 text-rose-700',
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
      className={`rounded-2xl border bg-gradient-to-br ${styles.bg} p-4 shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={`text-2xl sm:text-3xl font-bold mt-1 ${styles.value}`}>{value}</p>
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        </div>
        {icon && (
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${styles.icon}`}>
            <Icon name={icon} size={20} />
          </div>
        )}
      </div>
    </div>
  );
}
