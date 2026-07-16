interface AdminSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  accent?: 'indigo' | 'violet' | 'sky' | 'emerald' | 'amber' | 'rose';
  action?: React.ReactNode;
}

const accentStyles = {
  indigo: 'from-indigo-500/10 to-violet-500/5 border-indigo-100',
  violet: 'from-violet-500/10 to-purple-500/5 border-violet-100',
  sky: 'from-sky-500/10 to-cyan-500/5 border-sky-100',
  emerald: 'from-emerald-500/10 to-teal-500/5 border-emerald-100',
  amber: 'from-amber-500/10 to-orange-500/5 border-amber-100',
  rose: 'from-rose-500/10 to-pink-500/5 border-rose-100',
};

export default function AdminSection({
  title,
  description,
  children,
  accent = 'indigo',
  action,
}: AdminSectionProps) {
  return (
    <section className="bg-white/90 backdrop-blur rounded-2xl border border-border shadow-sm overflow-hidden">
      <div
        className={`px-5 py-4 border-b border-border bg-gradient-to-r ${accentStyles[accent]} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`}
      >
        <div>
          <h2 className="font-bricolage font-semibold text-foreground">{title}</h2>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </section>
  );
}
