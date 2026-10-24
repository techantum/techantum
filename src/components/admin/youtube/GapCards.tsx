'use client';

import AdminBadge from '@/components/admin/AdminBadge';
import { buildGapCards, type GapCard, type GapVideo } from '@/lib/youtube/gap-cards';

const STATUSES = ['proposed', 'approved', 'in_progress', 'implemented', 'under_review', 'completed', 'rejected'];

function Card({
  side,
  actions,
  onStatus,
}: {
  side: GapCard;
  actions: Record<string, any>[];
  onStatus: (id: string, status: string) => void;
}) {
  const tone = side.role === 'own' ? 'indigo' : side.role === 'competitor' ? 'amber' : 'default';
  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        {side.thumbnailUrl ? (
          <img src={side.thumbnailUrl} alt="" loading="lazy" className="h-16 w-28 shrink-0 rounded-xl object-cover" />
        ) : (
          <span className="flex h-16 w-28 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">No thumbnail</span>
        )}
        <div className="min-w-0">
          <AdminBadge variant={tone}>{side.roleLabel}</AdminBadge>
          <h3 className="mt-2 line-clamp-3 text-sm font-semibold text-slate-900">{side.title}</h3>
          <p className="mt-1 truncate text-xs text-slate-500">{side.channelName}</p>
          {side.watchUrl ? <a className="mt-1 inline-block text-xs font-semibold text-secondary" href={side.watchUrl} target="_blank" rel="noreferrer">Open on YouTube</a> : null}
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        <span className="font-medium text-slate-600">Content on thumbnail: </span>
        {side.thumbnailCaption || 'Not recorded'}
      </p>
      <div className="mt-4 space-y-3">
        {side.segments.map((segment) => (
          <section key={segment.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <div className="flex items-start justify-between gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{segment.label}</h4>
              <p className="max-w-[60%] text-right text-sm font-semibold text-slate-900">{segment.value}</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-emerald-800"><span className="font-semibold">Positive: </span>{segment.positive}</p>
            <p className="mt-1 text-xs leading-5 text-rose-800"><span className="font-semibold">Negative: </span>{segment.negative}</p>
          </section>
        ))}
      </div>
      <section className="mt-4 rounded-xl border border-slate-200 p-3">
        <h4 className="text-sm font-semibold text-slate-900">Proposed alternatives</h4>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-700">
          {side.alternatives.titles.map((item) => <li key={item}>{item}</li>)}
          {side.alternatives.thumbnail.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <p className="mt-2 text-sm leading-6 text-slate-600">{side.alternatives.description}</p>
      </section>
      <section className="mt-3 rounded-xl border border-slate-200 p-3">
        <h4 className="text-sm font-semibold text-slate-900">Improvement action plan</h4>
        <ul className="mt-2 space-y-3">
          {side.actions.map((item) => (
            <li key={item.title}>
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="text-sm leading-6 text-slate-600">{item.detail}</p>
            </li>
          ))}
        </ul>
        {actions.length ? (
          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
            {actions.map((item) => (
              <label key={item.id} className="flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-slate-700">{item.title}</span>
                <select className="h-9 rounded-lg border border-slate-200 px-2 text-sm" value={item.status} onChange={(event) => onStatus(item.id, event.target.value)}>
                  {STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
                </select>
              </label>
            ))}
          </div>
        ) : null}
      </section>
      <section className="mt-3 rounded-xl border border-slate-200 p-3">
        <h4 className="text-sm font-semibold text-slate-900">Other suggestions</h4>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-6 text-slate-700">
          {side.suggestions.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
    </article>
  );
}

export default function GapCards({
  videos,
  actions,
  onStatus,
}: {
  videos: GapVideo[];
  actions: Record<string, any>[];
  onStatus: (id: string, status: string) => void;
}) {
  const pair = buildGapCards(videos);
  if (!pair) return null;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card side={pair.left} actions={actions.filter((item) => item.video_id === pair.left.videoId)} onStatus={onStatus} />
      <Card side={pair.right} actions={actions.filter((item) => item.video_id === pair.right.videoId)} onStatus={onStatus} />
    </div>
  );
}
