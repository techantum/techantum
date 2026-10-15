type BadgeVariant = 'default' | 'indigo' | 'amber' | 'green' | 'rose' | 'sky' | 'violet';

interface AdminBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-600',
  indigo: 'bg-orange-50 text-secondary',
  amber: 'bg-amber-50 text-amber-700',
  green: 'bg-emerald-50 text-emerald-600',
  rose: 'bg-rose-50 text-rose-600',
  sky: 'bg-sky-50 text-sky-700',
  violet: 'bg-violet-50 text-violet-700',
};

export default function AdminBadge({ children, variant = 'default' }: AdminBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${variants[variant]}`}>
      {children}
    </span>
  );
}
