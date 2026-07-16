type BadgeVariant = 'default' | 'indigo' | 'amber' | 'green' | 'rose' | 'sky' | 'violet';

interface AdminBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-muted text-muted-foreground',
  indigo: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
  amber: 'bg-amber-50 text-amber-800 border border-amber-100',
  green: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  rose: 'bg-rose-50 text-rose-700 border border-rose-100',
  sky: 'bg-sky-50 text-sky-700 border border-sky-100',
  violet: 'bg-violet-50 text-violet-700 border border-violet-100',
};

export default function AdminBadge({ children, variant = 'default' }: AdminBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}
