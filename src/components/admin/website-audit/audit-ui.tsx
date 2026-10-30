'use client';

import Icon from '@/components/ui/AppIcon';

export function deltaLabel(current: number, previous: number | null | undefined) {
  if (previous == null) return { text: 'No prior period', tone: 'slate' as const };
  if (previous === 0 && current === 0) return { text: 'No change', tone: 'slate' as const };
  if (previous === 0) return { text: '+100% vs last month', tone: 'up' as const };
  const pct = Math.round(((current - previous) / Math.abs(previous)) * 100);
  if (pct === 0) return { text: 'No change', tone: 'slate' as const };
  return { text: `${pct > 0 ? '+' : ''}${pct}% vs last month`, tone: pct > 0 ? 'up' as const : 'down' as const };
}

export function KpiCard({
  icon,
  iconWrap,
  label,
  value,
  delta,
  invertDelta,
}: {
  icon: string;
  iconWrap: string;
  label: string;
  value: unknown;
  delta?: { text: string; tone: 'up' | 'down' | 'slate' };
  invertDelta?: boolean;
}) {
  const good = invertDelta ? delta?.tone === 'down' : delta?.tone === 'up';
  const bad = invertDelta ? delta?.tone === 'up' : delta?.tone === 'down';
  return (
    <div className="audit-fade rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${iconWrap}`}>
        <Icon name={icon} size={18} />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{String(value ?? '—')}</p>
      {delta ? (
        <p className={`mt-1 text-xs ${good ? 'text-emerald-600' : bad ? 'text-red-500' : 'text-slate-400'}`}>{delta.text}</p>
      ) : null}
    </div>
  );
}

export function ScoreSparkline({ points }: { points: { score: number; day?: string }[] }) {
  const values = points.map((item) => Number(item.score) || 0);
  if (values.length < 2) {
    return <p className="py-10 text-center text-sm text-slate-400">Not enough completed audits yet for a trend.</p>;
  }
  const w = 360;
  const h = 140;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 100);
  const coords = values.map((value, index) => {
    const x = (index / (values.length - 1)) * w;
    const y = h - ((value - min) / (max - min || 1)) * (h - 16) - 8;
    return `${x},${y}`;
  });
  const last = values[values.length - 1];
  const lastX = w;
  const lastY = h - ((last - min) / (max - min || 1)) * (h - 16) - 8;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-36 w-full">
      <defs>
        <linearGradient id="auditScoreFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(239 67 35)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="rgb(239 67 35)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline fill="url(#auditScoreFill)" stroke="none" points={`0,${h} ${coords.join(' ')} ${w},${h}`} />
      <polyline fill="none" stroke="rgb(239 67 35)" strokeWidth="2.5" points={coords.join(' ')} />
      <circle cx={lastX} cy={lastY} r="4" fill="rgb(239 67 35)" />
    </svg>
  );
}

export function IssueDonut({
  critical,
  warnings,
  review,
  passed,
}: {
  critical: number;
  warnings: number;
  review: number;
  passed: number;
}) {
  const total = Math.max(1, critical + warnings + review + passed);
  const slices = [
    { label: 'Critical', value: critical, color: '#ef4444' },
    { label: 'Warnings', value: warnings, color: '#f59e0b' },
    { label: 'Not tested', value: review, color: '#38bdf8' },
    { label: 'Passed', value: passed, color: '#22c55e' },
  ];
  let angle = 0;
  const gradient = slices.map((slice) => {
    const start = angle;
    angle += (slice.value / total) * 360;
    return `${slice.color} ${start}deg ${angle}deg`;
  }).join(', ');
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-36 w-36 shrink-0">
        <div className="h-full w-full rounded-full" style={{ background: `conic-gradient(${gradient})` }} />
        <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white">
          <p className="text-xl font-semibold text-slate-900">{critical + warnings + review + passed}</p>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Total</p>
        </div>
      </div>
      <ul className="space-y-1.5 text-sm">
        {slices.map((slice) => (
          <li key={slice.label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: slice.color }} />
              {slice.label}
            </span>
            <span className="font-medium text-slate-800">{slice.value} · {Math.round((slice.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#38bdf8',
  suggestion: '#a855f7',
};

const CATEGORY_COLORS: Record<string, string> = {
  seo: '#7c3aed',
  accessibility: '#0ea5e9',
  content: '#22c55e',
  forms: '#f97316',
  performance: '#f59e0b',
  ui: '#6366f1',
  ux: '#14b8a6',
  responsive: '#ec4899',
};

export function severityColor(severity: string) {
  return SEVERITY_COLORS[severity] || '#94a3b8';
}

export function categoryColor(category: string) {
  return CATEGORY_COLORS[category] || '#64748b';
}

export function HealthRing({ score }: { score: number | null | undefined }) {
  const value = score == null ? null : Math.max(0, Math.min(100, Number(score)));
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = value == null ? c : c - (value / 100) * c;
  const tone = value == null ? 'text-slate-400' : value >= 70 ? 'text-emerald-500' : value >= 50 ? 'text-amber-500' : 'text-red-500';
  const label = value == null ? '—' : value >= 70 ? 'Good' : value >= 50 ? 'Fair' : 'Needs work';
  return (
    <div className="flex h-full flex-col items-center justify-center px-2 py-3">
      <div className="relative h-[76px] w-[76px]">
        <svg viewBox="0 0 72 72" className="-rotate-90">
          <circle cx="36" cy="36" r={r} fill="none" stroke="#E2E8F0" strokeWidth="7" />
          <circle
            cx="36"
            cy="36"
            r={r}
            fill="none"
            stroke="#22C55E"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[22px] font-semibold text-slate-900">{value ?? '—'}</span>
      </div>
      <p className="mt-1.5 text-[11px] font-medium text-slate-500">Overall Health</p>
      <p className={`text-[12px] font-semibold ${tone}`}>{label}</p>
    </div>
  );
}

export function SeverityDonut({ counts }: { counts: Record<string, number> }) {
  const slices = [
    { key: 'critical', label: 'Critical', color: severityColor('critical') },
    { key: 'high', label: 'High', color: severityColor('high') },
    { key: 'medium', label: 'Medium', color: severityColor('medium') },
    { key: 'low', label: 'Low', color: severityColor('low') },
    { key: 'suggestion', label: 'Suggestion', color: severityColor('suggestion') },
  ].map((slice) => ({ ...slice, value: counts[slice.key] || 0 }));
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const denom = Math.max(1, total);
  let angle = 0;
  const gradient = slices.map((slice) => {
    const start = angle;
    angle += (slice.value / denom) * 360;
    return `${slice.color} ${start}deg ${angle}deg`;
  }).join(', ');
  return (
    <div className="flex items-center gap-8">
      <div className="relative h-[148px] w-[148px] shrink-0">
        <div className="h-full w-full rounded-full" style={{ background: `conic-gradient(${gradient})` }} />
        <div className="absolute inset-[22px] flex flex-col items-center justify-center rounded-full bg-white">
          <p className="text-[28px] font-semibold leading-none text-slate-900">{total}</p>
          <p className="mt-1 text-[11px] text-slate-400">Findings</p>
        </div>
      </div>
      <ul className="min-w-[168px] flex-1 space-y-2.5 text-sm">
        {slices.map((slice) => (
          <li key={slice.key} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-2.5 text-slate-500">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: slice.color }} />
              {slice.label}
            </span>
            <span className="tabular-nums text-slate-700">{slice.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const CATEGORY_META: Record<string, { icon: string; wrap: string }> = {
  seo: { icon: 'MagnifyingGlassIcon', wrap: 'bg-violet-50 text-violet-600' },
  accessibility: { icon: 'EyeIcon', wrap: 'bg-sky-50 text-sky-600' },
  content: { icon: 'DocumentTextIcon', wrap: 'bg-emerald-50 text-emerald-600' },
  forms: { icon: 'ClipboardDocumentListIcon', wrap: 'bg-orange-50 text-orange-500' },
  performance: { icon: 'BoltIcon', wrap: 'bg-amber-50 text-amber-500' },
  ui: { icon: 'SwatchIcon', wrap: 'bg-indigo-50 text-indigo-500' },
  ux: { icon: 'CursorArrowRaysIcon', wrap: 'bg-teal-50 text-teal-600' },
  responsive: { icon: 'DevicePhoneMobileIcon', wrap: 'bg-pink-50 text-pink-500' },
};

export function CategoryBars({ counts }: { counts: Record<string, number> }) {
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...rows.map(([, value]) => value));
  if (!rows.length) return <p className="py-8 text-center text-sm text-slate-400">No findings yet.</p>;
  return (
    <ul className="space-y-3.5">
      {rows.map(([key, value]) => {
        const meta = CATEGORY_META[key] || { icon: 'Square3Stack3DIcon', wrap: 'bg-slate-100 text-slate-500' };
        return (
          <li key={key} className="flex items-center gap-3">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.wrap}`}>
              <Icon name={meta.icon} size={16} />
            </span>
            <span className="w-[108px] shrink-0 text-sm capitalize text-slate-600">{key.replaceAll('_', ' ')}</span>
            <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(value / max) * 100}%`, background: categoryColor(key) }} />
            </div>
            <span className="w-6 text-right text-sm tabular-nums text-slate-700">{value}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function severityBadge(severity: string) {
  const map: Record<string, string> = {
    critical: 'bg-red-50 text-red-500',
    high: 'bg-orange-50 text-orange-500',
    medium: 'bg-amber-50 text-amber-600',
    low: 'bg-sky-50 text-sky-600',
    suggestion: 'bg-violet-50 text-violet-600',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-[3px] text-[11px] font-medium capitalize ${map[severity] || 'bg-slate-100 text-slate-600'}`}>
      <span className="h-3.5 w-3.5 rounded-[4px] opacity-80" style={{ background: severityColor(severity) }} />
      {severity}
    </span>
  );
}

export function findingStatusBadge(status: string) {
  const value = String(status || 'open');
  const reviewed = ['accepted', 'ignored', 'false_positive', 'fixed'].includes(value);
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${reviewed ? 'bg-sky-50 text-sky-500' : 'bg-rose-50 text-rose-400'}`}>
      {reviewed ? 'Reviewed' : 'Open'}
    </span>
  );
}

export function statusChip(status: string) {
  const value = String(status || '');
  const cls = value.includes('complet') ? 'bg-emerald-50 text-emerald-700' : value.includes('fail') ? 'bg-red-50 text-red-700' : value.includes('run') || value === 'queued' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600';
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${cls}`}>{value.replaceAll('_', ' ')}</span>;
}
