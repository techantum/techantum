'use client';

import AdminBadge from '@/components/admin/AdminBadge';
import GapCards from '@/components/admin/youtube/GapCards';
import { buildGapCards } from '@/lib/youtube/gap-cards';
import { WATCH_HOURS_NOTE } from '@/lib/youtube/parse';
import { assessGoals, compactCount, formatPublished, likesPlusComments, perThousandViews, viewReason } from '@/lib/youtube/analysis-display';

export default function AnalysisComplete({
  analysis,
  onStatus,
}: {
  analysis: Record<string, any>;
  onStatus?: (id: string, status: string) => void;
}) {
  const videos: Record<string, any>[] = analysis?.evidence?.videos || [];
  const goals: string[] = analysis?.config?.goals || [];
  const result = analysis?.result || {};
  const observations = Array.isArray(result.observations) ? result.observations : [];
  const assessments = assessGoals(videos, goals);
  const ranked = [...videos].sort((a, b) => Number(b.view_count || 0) - Number(a.view_count || 0));
  const top = ranked[0];
  const gapPair = buildGapCards(videos);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-orange-100 bg-orange-50 px-5 py-4">
        <p className="text-sm font-semibold text-secondary">Analysis complete</p>
        <h3 className="mt-1 font-bricolage text-lg font-semibold text-slate-900">{result.summary?.headline || analysis.name}</h3>
        <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">{result.summary?.body || 'Public Data API counts for the selected videos. Recommendations are tests, not guarantees.'}</p>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {assessments.map((item) => (
          <article key={item.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <AdminBadge variant={item.status === 'up' ? 'green' : item.status === 'unavailable' ? 'default' : 'rose'}>
              {item.status === 'up' ? 'Up to the mark' : item.status === 'unavailable' ? 'Not in Data API' : 'Needs improvement'}
            </AdminBadge>
            <p className="mt-2 text-sm font-semibold text-slate-900">{item.label}</p>
            <p className="mt-1 text-sm text-slate-700">{item.headline}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
          </article>
        ))}
      </section>

      {top ? (
        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Highest public views in this set</p>
          <p className="mt-1 font-semibold text-slate-900">{top.title || top.youtube_video_id}</p>
          <p className="mt-1 text-sm text-slate-600">{compactCount(top.view_count)} views · {viewReason(top)}</p>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="font-bricolage text-base font-semibold text-slate-900">Analysed videos</h2>
          <p className="text-xs text-slate-400">{WATCH_HOURS_NOTE}</p>
        </div>
        <ul className="divide-y divide-slate-50">
          {videos.map((video) => {
            const actions = likesPlusComments(video);
            const perK = perThousandViews(actions, video.view_count);
            return (
              <li key={video.id} className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center">
                {video.thumbnail_url ? <img src={video.thumbnail_url} alt="" className="h-20 w-32 shrink-0 rounded-xl object-cover" /> : <span className="h-20 w-32 shrink-0 rounded-xl bg-slate-100" />}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{video.title || video.youtube_video_id}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {video.relationship === 'own' ? 'You' : 'Competitor'} · {video.channel_name || '—'} · Uploaded {formatPublished(video.published_at)}
                    {video.duration_label ? ` · ${video.duration_label}` : ''}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-5">
                  <div><dt className="text-[11px] uppercase text-slate-400">Views</dt><dd className="font-semibold">{compactCount(video.view_count)}</dd></div>
                  <div><dt className="text-[11px] uppercase text-slate-400">Likes</dt><dd className="font-semibold">{compactCount(video.like_count)}</dd></div>
                  <div><dt className="text-[11px] uppercase text-slate-400">Comments</dt><dd className="font-semibold">{compactCount(video.comment_count)}</dd></div>
                  <div><dt className="text-[11px] uppercase text-slate-400" title="Likes plus comments per 1,000 views">Likes+comments / 1K</dt><dd className="font-semibold">{perK == null ? '—' : perK}</dd></div>
                  <div><dt className="text-[11px] uppercase text-slate-400">Watch hours</dt><dd className="font-semibold">—</dd></div>
                </dl>
              </li>
            );
          })}
        </ul>
        {!videos.length ? <p className="px-4 py-8 text-center text-sm text-slate-500">No videos were stored on this analysis.</p> : null}
      </section>

      {gapPair && onStatus ? <GapCards videos={videos} actions={analysis.actions || []} onStatus={onStatus} briefs={Array.isArray(result.video_briefs) ? result.video_briefs : []} /> : null}

      {observations.length ? (
        <section className="grid gap-3 md:grid-cols-2">
          {observations.map((card: Record<string, any>, index: number) => (
            <article key={`${card.headline}-${index}`} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <AdminBadge variant="indigo">{card.category}</AdminBadge>
              <h3 className="mt-2 text-sm font-semibold text-slate-900">{card.headline}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{card.observation}</p>
              {card.action ? <p className="mt-2 text-xs text-slate-500">Next: {card.action}</p> : null}
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}
