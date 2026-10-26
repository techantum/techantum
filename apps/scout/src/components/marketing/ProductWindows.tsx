import type { ReactNode } from 'react';
import Icon from '@/components/ui/AppIcon';

const ROWS = [
  { title: 'A practical guide', views: '24,180', likes: '810', comments: '64' },
  { title: 'Behind the process', views: '18,420', likes: '645', comments: '42' },
  { title: 'What we learned', views: '31,060', likes: '1,120', comments: '89' },
];

function BrowserBar({ url, showAvatar = false }: { url: string; showAvatar?: boolean }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
      <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
      <div className="ml-2 flex flex-1 justify-center">
        <div className="flex w-full max-w-xs items-center justify-center gap-1 rounded-full bg-white px-3 py-1 text-[10px] text-slate-500 shadow-sm">
          <span>🔒</span>
          <span className="truncate">{url}</span>
        </div>
      </div>
      {showAvatar ? (
        <div className="flex items-center gap-1.5">
          <span className="text-slate-300">🔔</span>
          <span className="h-5 w-5 rounded-full bg-violet-500" />
        </div>
      ) : null}
    </div>
  );
}

function StatPills({ withIcons = false }: { withIcons?: boolean }) {
  const items = [
    { label: 'Channels', value: '3', icon: '▶' },
    { label: 'Selected videos', value: '12', icon: '▣' },
    { label: 'Analyses', value: '1 set', icon: '▤' },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl bg-[#F3E8FF] px-3 py-3">
          <p className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
            {withIcons ? <span className="text-violet-400">{item.icon}</span> : null}
            {item.label}
          </p>
          <p className="mt-1 font-bricolage text-xl font-bold text-slate-900">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function ComparisonTable({ extraRow = false }: { extraRow?: boolean }) {
  const rows = extraRow ? ROWS : ROWS.slice(0, 2);
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-900">Video comparison</p>
      <div className="grid grid-cols-[1.4fr_0.55fr_0.45fr_0.55fr] gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        <span>Video</span>
        <span>Views</span>
        <span>Likes</span>
        <span>Comments</span>
      </div>
      {rows.map((row, i) => (
        <div key={row.title} className="mt-2 grid grid-cols-[1.4fr_0.55fr_0.45fr_0.55fr] items-center gap-2 text-[12px]">
          <span className="flex items-center gap-2 font-medium text-slate-800">
            <span className={`h-2 w-2 rounded-full ${i === 0 ? 'bg-violet-500' : i === 1 ? 'bg-fuchsia-400' : 'bg-indigo-400'}`} />
            {row.title}
          </span>
          <span className="text-slate-600">{row.views}</span>
          <span className="text-slate-600">{row.likes}</span>
          <span className="text-slate-600">{row.comments}</span>
        </div>
      ))}
    </div>
  );
}

export function WorkspacePreview() {
  return (
    <div className="rounded-[28px] bg-[#F3E8FF] p-4 sm:p-5">
      <div className="overflow-hidden rounded-[20px] border border-white bg-white shadow-[0_18px_40px_rgba(124,58,237,0.12)]">
        <BrowserBar url="app.revealeo.com/workspace" showAvatar />
        <div className="grid grid-cols-[9.25rem_1fr]">
          <aside className="border-r border-slate-100 bg-[#FAF7FF] p-3">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Workspace</p>
            <div className="mt-2 space-y-1 text-[11px] leading-4">
              <p className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-violet-100 px-2 py-1.5 font-semibold text-violet-700">
                <Icon name="PlayCircleIcon" size={12} /> YouTube Research
              </p>
              <p className="flex items-center gap-1.5 whitespace-nowrap px-2 py-1.5 text-slate-500">
                <Icon name="MapPinIcon" size={12} /> Lead Discovery
              </p>
              <p className="flex items-center gap-1.5 whitespace-nowrap px-2 py-1.5 text-slate-500">
                <Icon name="DocumentChartBarIcon" size={12} /> Reports
              </p>
              <p className="flex items-center gap-1.5 whitespace-nowrap px-2 py-1.5 text-slate-500">
                <Icon name="Cog6ToothIcon" size={12} /> Settings
              </p>
            </div>
          </aside>
          <div className="p-4">
            <p className="text-[10px] text-violet-600">revealeo / YouTube Research</p>
            <h3 className="mt-1 text-[15px] font-bold text-slate-900">From public data to useful insight</h3>
            <p className="mt-0.5 text-[11px] text-slate-400">Demo analysis · Public YouTube Data API counts</p>
            <div className="mt-3">
              <StatPills />
            </div>
            <div className="mt-4">
              <ComparisonTable />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function YoutubeResearchPreview() {
  return (
    <div className="overflow-hidden rounded-[22px] border border-white bg-white shadow-[0_18px_40px_rgba(124,58,237,0.12)]">
      <BrowserBar url="app.revealeo.com/research" />
      <div className="p-5">
        <p className="text-[10px] text-violet-600">revealeo / workspace / YouTube Research</p>
        <h3 className="mt-1 text-lg font-bold text-slate-900">YouTube Research</h3>
        <p className="text-[11px] text-slate-400">Demo data · Public YouTube Data API counts</p>
        <div className="mt-4">
          <StatPills withIcons />
        </div>
        <div className="mt-5">
          <ComparisonTable extraRow />
        </div>
        <div className="mt-4 rounded-xl bg-[#F3E8FF] px-3 py-2 text-[11px] font-medium text-violet-700">
          ▣ Public data + your notes → a saved report
        </div>
      </div>
    </div>
  );
}

export function Check({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-[14px] leading-6 text-slate-600">
      <Icon name="CheckCircleIcon" size={18} className="mt-0.5 shrink-0 text-violet-500" />
      <span>{children}</span>
    </li>
  );
}
