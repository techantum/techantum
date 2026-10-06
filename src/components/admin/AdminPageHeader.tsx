interface AdminPageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function AdminPageHeader({ title, description, action }: AdminPageHeaderProps) {
  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Workspace</p>
        <h1 className="font-bricolage text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-3xl text-sm text-slate-500 sm:text-base">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
