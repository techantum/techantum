interface AdminSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  accent?: 'indigo' | 'violet' | 'sky' | 'emerald' | 'amber' | 'rose';
  action?: React.ReactNode;
}

const accentStyles = {
  indigo: 'from-indigo-500 via-violet-500 to-fuchsia-500',
  violet: 'from-violet-500 via-purple-500 to-fuchsia-500',
  sky: 'from-sky-500 via-cyan-500 to-teal-500',
  emerald: 'from-emerald-500 via-teal-500 to-cyan-500',
  amber: 'from-amber-500 via-orange-500 to-rose-500',
  rose: 'from-rose-500 via-pink-500 to-fuchsia-500',
};

const headerStyles = {
  indigo: 'from-indigo-50/90 via-white to-violet-50/80',
  violet: 'from-violet-50/90 via-white to-fuchsia-50/80',
  sky: 'from-sky-50/90 via-white to-cyan-50/80',
  emerald: 'from-emerald-50/90 via-white to-teal-50/80',
  amber: 'from-amber-50/90 via-white to-orange-50/80',
  rose: 'from-rose-50/90 via-white to-pink-50/80',
};

export default function AdminSection({
  title,
  description,
  children,
  accent = 'indigo',
  action,
}: AdminSectionProps) {
  return (
    <section className="w-full bg-white/85 backdrop-blur-xl rounded-3xl border border-white/80 shadow-lg shadow-slate-900/5 overflow-hidden">
      <div className={`h-1.5 bg-gradient-to-r ${accentStyles[accent]}`} />
      <div
        className={`px-5 py-4 border-b border-slate-100 bg-gradient-to-r ${headerStyles[accent]} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`}
      >
        <div>
          <h2 className="font-bricolage font-semibold text-slate-900">{title}</h2>
          {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </section>
  );
}
