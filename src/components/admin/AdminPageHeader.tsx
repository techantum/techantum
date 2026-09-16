interface AdminPageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function AdminPageHeader({ title, description, action }: AdminPageHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/70 backdrop-blur-xl shadow-sm shadow-indigo-500/5">
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-fuchsia-400/10 to-cyan-400/10" />
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-400/20 blur-2xl" />
      <div className="absolute -bottom-12 left-1/3 h-24 w-24 rounded-full bg-cyan-400/20 blur-2xl" />
      <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 px-5 py-5 sm:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-500/80 mb-1">TechAntum Admin</p>
          <h1 className="font-bricolage text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-900 via-indigo-800 to-fuchsia-700 bg-clip-text text-transparent">
            {title}
          </h1>
          {description && <p className="text-slate-600 mt-1.5 text-sm sm:text-base">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
