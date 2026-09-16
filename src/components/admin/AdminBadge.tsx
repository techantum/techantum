type BadgeVariant = 'default' | 'indigo' | 'amber' | 'green' | 'rose' | 'sky' | 'violet';

interface AdminBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-600 border border-slate-200',
  indigo: 'bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 border border-indigo-100',
  amber: 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 border border-amber-100',
  green: 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border border-emerald-100',
  rose: 'bg-gradient-to-r from-rose-50 to-orange-50 text-rose-700 border border-rose-100',
  sky: 'bg-gradient-to-r from-sky-50 to-cyan-50 text-sky-700 border border-sky-100',
  violet: 'bg-gradient-to-r from-violet-50 to-fuchsia-50 text-violet-700 border border-violet-100',
};

export default function AdminBadge({ children, variant = 'default' }: AdminBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${variants[variant]}`}>
      {children}
    </span>
  );
}
