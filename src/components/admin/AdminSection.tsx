import Icon from '@/components/ui/AppIcon';

interface AdminSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  accent?: 'indigo' | 'violet' | 'sky' | 'emerald' | 'amber' | 'rose';
  action?: React.ReactNode;
  icon?: string;
}

export default function AdminSection({
  title,
  description,
  children,
  action,
  icon,
}: AdminSectionProps) {
  return (
    <section className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          {icon && <Icon name={icon} size={18} className="shrink-0 text-slate-500" />}
          <div className="min-w-0">
            <h2 className="font-bricolage text-[15px] font-semibold text-slate-900">{title}</h2>
            {description && <p className="text-xs text-slate-400">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
