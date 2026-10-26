export default function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[320px] items-center justify-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-secondary" />
        <p className="text-sm font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}
