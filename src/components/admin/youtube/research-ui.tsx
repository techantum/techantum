'use client';

import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AdminBadge from '@/components/admin/AdminBadge';
import AdminButton from '@/components/admin/AdminButton';
import AdminSection from '@/components/admin/AdminSection';
import Icon from '@/components/ui/AppIcon';
import { metric, youtubePortalHeader } from '@/components/admin/youtube/YoutubeFrame';

export const CHANNEL_COLORS = ['#EA580C', '#0F766E', '#2563EB', '#7C3AED', '#BE123C', '#0F172A'];

export const DATE_PRESETS = [
  { id: '7', label: 'Last 7 days', short: '7D', days: 7 },
  { id: '30', label: 'Last 30 days', short: '30D', days: 30 },
  { id: '90', label: 'Last 3 months', short: '3M', days: 90 },
  { id: '180', label: 'Last 6 months', short: '6M', days: 180 },
  { id: '365', label: 'Last 12 months', short: '12M', days: 365 },
  { id: 'all', label: 'All time', short: 'All time', days: 0 },
];

export type ResearchFilterState = {
  from: string;
  to: string;
  topicId: string;
  categoryId: string;
  q: string;
  tag: string;
  content: string;
  placement: string;
  channelIds?: string;
  sort?: string;
};

export const EMPTY_FILTERS: ResearchFilterState = { from: '', to: '', topicId: '', categoryId: '', q: '', tag: '', content: '', placement: '', channelIds: '', sort: 'published_at' };

export const VIDEO_SORTS = [
  { id: 'published_at', label: 'Newest' },
  { id: 'view_count', label: 'Most viewed' },
  { id: 'like_count', label: 'Most liked' },
  { id: 'comment_count', label: 'Most commented' },
  { id: 'duration_seconds', label: 'Longest' },
  { id: 'title', label: 'Title A–Z' },
];

export type ResearchFilterOptions = {
  channels?: { id: string; label: string }[];
  topics?: { id: string; name: string }[];
  categories?: { id: string; label: string; count?: number }[];
  content?: { id: string; label: string; count?: number }[];
  placement?: { id: string; label: string; count?: number }[];
  tags?: { tag: string; count?: number }[];
};

const selectClass = 'h-11 w-full min-w-[10.5rem] rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-800 shadow-none';

function FilterSelect({
  value,
  onChange,
  children,
  className = '',
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <label className={`relative block ${className}`}>
      <span className="sr-only">{label}</span>
      <select className={selectClass} value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}>
        {children}
      </select>
    </label>
  );
}

export function isoDate(value = new Date()) {
  return value.toISOString().slice(0, 10);
}

export function applyPreset(id: string) {
  if (id === 'all') return { from: '', to: '' };
  const preset = DATE_PRESETS.find((item) => item.id === id);
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - (preset?.days || 30));
  return { from: isoDate(from), to: isoDate(to) };
}

export function handleLabel(value: unknown) {
  const text = String(value || '').replace(/^@/, '');
  return text ? `@${text}` : '';
}

export function PlacementBadge({ value }: { value?: string | null }) {
  if (value === 'Paid') {
    return <span className="inline-flex rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-secondary">Paid</span>;
  }
  if (value === 'Organic') {
    return <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Organic</span>;
  }
  return <span className="text-slate-400">—</span>;
}

export function ResearchFilters({
  value,
  options,
  onChange,
  onApply,
  onReset,
  extra,
  compareDisabled,
  onCompare,
  selectedCount = 0,
}: {
  value: ResearchFilterState;
  options?: ResearchFilterOptions;
  onChange: (next: ResearchFilterState) => void;
  onApply: (next?: ResearchFilterState) => void;
  onReset: () => void;
  extra?: React.ReactNode;
  compareDisabled?: boolean;
  onCompare?: () => void;
  selectedCount?: number;
}) {
  const set = (patch: Partial<ResearchFilterState>) => {
    const next = { ...value, ...patch };
    onChange(next);
    return next;
  };
  const apply = (patch: Partial<ResearchFilterState>) => onApply(set(patch));
  const categories = options?.categories || [];
  const content = options?.content || [];
  const channels = options?.channels || [];
  const tags = options?.tags || [];
  const applied = [
    value.placement === 'organic' ? { key: 'placement', label: 'Organic' } : value.placement === 'paid' ? { key: 'placement', label: 'Paid' } : null,
    value.content === 'short' ? { key: 'content', label: 'Shorts' } : value.content === 'video' ? { key: 'content', label: 'Videos' } : null,
    value.categoryId ? { key: 'categoryId', label: categories.find((item) => item.id === value.categoryId)?.label || 'Category' } : null,
    value.channelIds ? { key: 'channelIds', label: channels.find((item) => item.id === value.channelIds)?.label || 'Channel' } : null,
    value.tag ? { key: 'tag', label: value.tag } : null,
  ].filter(Boolean) as { key: keyof ResearchFilterState; label: string }[];
  return (
    <section className="sticky top-[var(--yt-sticky)] z-30 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[16rem] flex-1">
          <Icon name="MagnifyingGlassIcon" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm" placeholder="Search title, description, or tags" value={value.q} onChange={(event) => set({ q: event.target.value })} />
        </label>
        <FilterSelect label="Channel" value={value.channelIds || ''} onChange={(channelIds) => apply({ channelIds })}>
          <option value="">All channels</option>
          {channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.label}</option>)}
        </FilterSelect>
        <FilterSelect label="Category" value={value.categoryId} onChange={(categoryId) => apply({ categoryId })}>
          <option value="">All categories</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
        </FilterSelect>
        <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-500">
          <input type="date" className="w-[8.5rem] border-0 bg-transparent p-0 text-sm text-slate-800 focus:ring-0" value={value.from} onChange={(event) => set({ from: event.target.value })} aria-label="From" />
          <span>to</span>
          <input type="date" className="w-[8.5rem] border-0 bg-transparent p-0 text-sm text-slate-800 focus:ring-0" value={value.to} onChange={(event) => set({ to: event.target.value })} aria-label="To" />
        </div>
        <FilterSelect label="Content type" value={value.content} onChange={(contentValue) => apply({ content: contentValue })}>
          <option value="">Videos & Shorts</option>
          <option value="video">Videos{content.find((item) => item.id === 'video')?.count != null ? ` (${content.find((item) => item.id === 'video')?.count})` : ''}</option>
          <option value="short">Shorts{content.find((item) => item.id === 'short')?.count != null ? ` (${content.find((item) => item.id === 'short')?.count})` : ''}</option>
        </FilterSelect>
        <FilterSelect label="Organic or paid" value={value.placement} onChange={(placement) => apply({ placement })}>
          <option value="">Organic & Paid</option>
          <option value="organic">Organic</option>
          <option value="paid">Paid</option>
        </FilterSelect>
        <FilterSelect label="Tags" value={value.tag} onChange={(tag) => apply({ tag })}>
          <option value="">All tags</option>
          {tags.map((item) => <option key={item.tag} value={item.tag}>{item.tag}</option>)}
        </FilterSelect>
        <FilterSelect label="Sort by" value={value.sort || 'published_at'} onChange={(sort) => apply({ sort })}>
          {VIDEO_SORTS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </FilterSelect>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {DATE_PRESETS.map((preset) => (
          <button key={preset.id} type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-secondary hover:text-secondary" onClick={() => apply(applyPreset(preset.id))}>
            {preset.short}
          </button>
        ))}
        {applied.length ? <span className="mx-1 h-5 w-px bg-slate-200" /> : null}
        {applied.map((item) => (
          <button key={item.key} type="button" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600" onClick={() => apply({ [item.key]: '' } as Partial<ResearchFilterState>)}>
            Applied: {item.label} <span className="ml-1 text-slate-400">×</span>
          </button>
        ))}
        <span className="ml-auto flex flex-wrap items-center gap-2">
          {extra}
          <AdminButton variant="primary" onClick={() => onApply(value)}>Search</AdminButton>
          <AdminButton onClick={onReset}>Clear</AdminButton>
          {onCompare ? (
            <AdminButton variant="primary" disabled={compareDisabled} onClick={onCompare}>Compare selected{selectedCount ? ` (${selectedCount})` : ''}</AdminButton>
          ) : null}
        </span>
      </div>
      {onCompare ? (
        <p className="mt-2 text-xs text-slate-500">
          {selectedCount >= 2
            ? `${selectedCount} videos selected. Compare selected is ready.`
            : 'Select at least two videos in the list to compare.'}
        </p>
      ) : null}
    </section>
  );
}

export function ChartCard({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <AdminSection title={title} icon="ChartBarIcon" description={hint}>
      <div className="h-64">{children}</div>
    </AdminSection>
  );
}

export function EmptyChart({ text }: { text: string }) {
  return <p className="flex h-full items-center justify-center text-sm text-slate-500">{text}</p>;
}

const CHART_MOTION = {
  isAnimationActive: true,
  animationBegin: 80,
  animationDuration: 900,
  animationEasing: 'ease-out' as const,
};

export function MonthBarChart({ data, bars, empty }: { data: Record<string, unknown>[]; bars: { key: string; color: string }[]; empty?: string }) {
  if (!data.length) return <EmptyChart text={empty || 'No imported videos match these filters.'} />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} key={`month-${bars.map((bar) => bar.key).join('-')}-${data.length}`}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" fontSize={11} />
        <YAxis fontSize={11} />
        <Tooltip />
        <Legend />
        {bars.map((bar, index) => (
          <Bar key={bar.key} dataKey={bar.key} fill={bar.color} radius={[4, 4, 0, 0]} {...CHART_MOTION} animationBegin={80 + index * 120} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SimpleBars({ rows, color = '#EA580C' }: { rows: { label: string; value: number }[]; color?: string }) {
  if (!rows.length) return <EmptyChart text="No values for this view." />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout="vertical" margin={{ left: 24 }} key={`simple-${rows.length}-${color}`}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" fontSize={11} />
        <YAxis type="category" dataKey="label" width={110} fontSize={11} />
        <Tooltip />
        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} {...CHART_MOTION} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function VideoMiniTable({
  title,
  rows,
  empty,
  href,
}: {
  title: string;
  rows: Record<string, any>[];
  empty: string;
  href?: string;
}) {
  return (
    <AdminSection title={title} icon="FilmIcon" action={href ? <Link className="text-sm font-semibold text-secondary" href={href}>View all</Link> : null}>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                {['Video', 'Channel', 'Published', 'Views', 'Likes', 'Comments'].map((heading) => <th key={heading} className="px-2 py-2">{heading}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((video) => (
                <tr key={video.id} className="border-t border-slate-100">
                  <td className="px-2 py-2">
                    <span className="flex items-center gap-2">
                      {video.thumbnail_url ? <img src={video.thumbnail_url} alt="" className="h-9 w-14 rounded object-cover" /> : <span className="h-9 w-14 rounded bg-slate-100" />}
                      <span className="max-w-[240px] truncate font-medium">{video.title || (video.stale ? 'Refresh required' : video.youtube_video_id)}</span>
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <AdminBadge variant={video.relationship === 'own' ? 'indigo' : 'default'}>{video.relationship === 'own' ? 'Own' : 'Competitor'}</AdminBadge>
                    <span className="ml-2 text-slate-600">{video.channel_name || '—'}</span>
                  </td>
                  <td className="px-2 py-2 text-slate-500">{video.published_at ? String(video.published_at).slice(0, 10) : '—'}</td>
                  <td className="px-2 py-2">{metric(video.view_count)}</td>
                  <td className="px-2 py-2">{metric(video.like_count)}</td>
                  <td className="px-2 py-2">{metric(video.comment_count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="text-sm text-slate-500">{empty}</p>}
    </AdminSection>
  );
}

export function mergeMonths(channels: { id: string; channel_name?: string | null; youtube_channel_id?: string; insights?: { months?: { month: string; imported: number; views: number | null }[] } }[]) {
  const months = [...new Set(channels.flatMap((channel) => channel.insights?.months?.map((item) => item.month) || []))].sort();
  return months.map((month) => {
    const row: Record<string, unknown> = { month };
    channels.forEach((channel, index) => {
      const found = channel.insights?.months?.find((item) => item.month === month);
      const key = channel.channel_name || channel.youtube_channel_id || `Channel ${index + 1}`;
      row[`${key} imported`] = found?.imported || 0;
      row[`${key} views`] = found?.views ?? null;
    });
    return row;
  });
}

export async function downloadResearchReport(projectId: string, reportId: string, format: 'pdf' | 'xlsx') {
  const response = await fetch(`/api/admin/youtube/projects/${projectId}/research-reports/${reportId}/export?format=${format}`, {
    headers: youtubePortalHeader(),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Could not export report');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const match = response.headers.get('content-disposition')?.match(/filename="([^"]+)"/);
  link.href = url;
  link.download = match?.[1] || `youtube-research-report.${format}`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadProjectExport(body: Record<string, unknown>) {
  const response = await fetch('/api/admin/youtube/reports/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...youtubePortalHeader() },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Could not export');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const match = response.headers.get('content-disposition')?.match(/filename="([^"]+)"/);
  link.href = url;
  link.download = match?.[1] || 'youtube-research.xlsx';
  link.click();
  URL.revokeObjectURL(url);
}
