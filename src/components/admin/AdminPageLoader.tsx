'use client';

export default function AdminPageLoader({
  open,
  label = 'Fetching data…',
}: {
  open: boolean;
  label?: string;
}) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/80 backdrop-blur-[2px]">
      <div className="flex flex-col items-center gap-3">
        <div className="relative flex h-16 w-16 items-end justify-center gap-1 rounded-2xl bg-slate-50 ring-1 ring-slate-100">
          {[10, 18, 14, 22, 12].map((height, index) => (
            <span
              key={height}
              className="admin-analytics-bar w-1.5 rounded-full bg-secondary"
              style={{ height, animationDelay: `${index * 120}ms` }}
            />
          ))}
          <svg className="pointer-events-none absolute inset-x-2 top-2 h-6" viewBox="0 0 48 24" fill="none">
            <path
              className="admin-analytics-spark"
              d="M1 18 L10 12 L18 15 L28 6 L38 10 L47 4"
              stroke="#EF4323"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-600">{label}</p>
      </div>
    </div>
  );
}
