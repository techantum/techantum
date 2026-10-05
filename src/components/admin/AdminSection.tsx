interface AdminSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  accent?: 'indigo' | 'violet' | 'sky' | 'emerald' | 'amber' | 'rose';
  action?: React.ReactNode;
}

export default function AdminSection({
  title,
  description,
  children,
  action,
}: AdminSectionProps) {
  return (
    <section className="w-full rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bricolage font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      <div className="space-y-4 overflow-visible p-5">{children}</div>
    </section>
  );
}
