'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { saveAnalysisAsReport, saveAndDownloadAnalysisReport } from '@/components/admin/youtube/research-ui';
import { useProjectId, useYoutubePageBase } from '@/components/admin/youtube/YoutubeFrame';
import { partnerBtnPrimary, partnerBtnSecondary } from '@/components/partner/PartnerUi';
import Icon from '@/components/ui/AppIcon';
import {
  compactCount,
  formatPublished,
  likesCommentsShare,
  likesPlusComments,
  pctDiff,
  pickComparePair,
} from '@/lib/youtube/analysis-display';
import { lengthLabel } from '@/lib/youtube/parse';

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'ChartBarIcon' },
  { id: 'content', label: 'Content', icon: 'DocumentTextIcon' },
  { id: 'engagement', label: 'Engagement', icon: 'ChatBubbleLeftRightIcon' },
  { id: 'audience', label: 'Audience', icon: 'UserGroupIcon' },
  { id: 'seo', label: 'SEO & Tags', icon: 'HashtagIcon' },
] as const;

function badgeClass(kind: 'better' | 'same' | 'yours') {
  if (kind === 'better') return 'rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700';
  if (kind === 'yours') return 'rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700';
  return 'rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600';
}

function DiffCell({ yours, theirs }: { yours: unknown; theirs: unknown }) {
  const diff = pctDiff(yours, theirs);
  if (diff == null) return <span className="text-sm text-slate-400">—</span>;
  const up = diff > 0;
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${up ? 'text-emerald-600' : diff < 0 ? 'text-rose-500' : 'text-slate-500'}`}>
      {up ? '↗' : diff < 0 ? '↘' : '→'} {diff > 0 ? '+' : ''}{diff}%
    </span>
  );
}

function MetricChip({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
      <Icon name={icon} size={16} className="shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function VideoHero({
  video,
  tone,
}: {
  video: Record<string, any> | null;
  tone: 'own' | 'competitor';
}) {
  if (!video) {
    return (
      <article className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-400">
        Select another video to compare.
      </article>
    );
  }
  const own = tone === 'own' || video.relationship === 'own';
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 pt-4">
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${own ? 'bg-sky-50 text-sky-700' : 'bg-violet-50 text-violet-700'}`}>
          {own ? 'Your Video' : 'Competitor'}
        </span>
      </div>
      <div className="relative mx-4 mt-3 overflow-hidden rounded-xl bg-slate-100">
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt="" className="aspect-video w-full object-cover" />
        ) : (
          <div className="aspect-video" />
        )}
        {lengthLabel(video) ? (
          <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            {lengthLabel(video)}
          </span>
        ) : null}
      </div>
      <div className="space-y-3 p-4">
        <h3 className="line-clamp-2 font-bricolage text-base font-semibold text-slate-900">{video.title || video.youtube_video_id}</h3>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {video.channel_thumbnail_url ? (
            <img src={video.channel_thumbnail_url} alt="" className="h-6 w-6 rounded-full object-cover" />
          ) : (
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
              {(video.channel_name || 'C').slice(0, 1).toUpperCase()}
            </span>
          )}
          <div>
            <p className="font-medium text-slate-700">{own ? 'Your Channel' : video.channel_name || 'Competitor channel'}</p>
            <p>Published · {formatPublished(video.published_at)}</p>
          </div>
        </div>
        {video.description ? <p className="line-clamp-2 text-sm leading-5 text-slate-500">{video.description}</p> : null}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetricChip icon="EyeIcon" label="Views" value={compactCount(video.view_count)} />
          <MetricChip icon="HandThumbUpIcon" label="Likes" value={compactCount(video.like_count)} />
          <MetricChip icon="ChatBubbleLeftIcon" label="Comments" value={compactCount(video.comment_count)} />
          <MetricChip icon="UserPlusIcon" label="Subscribers" value={compactCount(video.subscriber_count)} />
        </div>
      </div>
    </article>
  );
}

export default function AnalysisComplete({
  analysis,
}: {
  analysis: Record<string, any>;
  onStatus?: (id: string, status: string) => void;
}) {
  const projectId = useProjectId();
  const base = useYoutubePageBase();
  const videos: Record<string, any>[] = analysis?.evidence?.videos || [];
  const result = analysis?.result || {};
  const observations = Array.isArray(result.observations) ? result.observations : [];
  const pair = useMemo(() => pickComparePair(videos), [videos]);
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('overview');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const yours = pair.yours;
  const competitor = pair.competitor;

  const insight = result.summary?.body
    || (competitor && yours
      ? `The comparison uses public Data API counts. ${competitor.title || 'The other video'} has ${compactCount(competitor.view_count)} views versus ${compactCount(yours.view_count)} on your selected video. Thumbnail text, title wording, and length are public fields you can test — watch time and audience retention are not in this integration.`
      : 'This analysis uses public views, likes, comments, titles, thumbnails, and tags. YouTube Analytics watch time and audience data are not included.');

  const saveReport = async (download: boolean) => {
    setBusy(download ? 'download' : 'save');
    setError('');
    setMessage('');
    try {
      if (download) await saveAndDownloadAnalysisReport(projectId, analysis);
      else await saveAnalysisAsReport(projectId, analysis);
      setMessage(download ? 'Report downloaded and saved to Reports.' : 'Comparison saved to Reports.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the report');
    } finally {
      setBusy('');
    }
  };

  const contentRows = [
    {
      icon: 'DocumentTextIcon',
      label: 'Video Title',
      detail: yours && competitor
        ? (String(competitor.title || '').length > String(yours.title || '').length
          ? 'Competitor title is longer and may carry a stronger hook'
          : 'Titles are similar in length from public metadata')
        : 'Public title only',
      badge: yours && competitor && /\?|how |worth|honest|full /i.test(String(competitor.title || '')) && !/\?|how |worth|honest|full /i.test(String(yours.title || ''))
        ? { kind: 'better' as const, text: 'Competitor better' }
        : { kind: 'same' as const, text: 'Same' },
    },
    {
      icon: 'PhotoIcon',
      label: 'Thumbnail',
      detail: competitor?.thumbnail_text && !yours?.thumbnail_text
        ? `Competitor thumbnail text: “${String(competitor.thumbnail_text).slice(0, 80)}”`
        : yours?.thumbnail_text || competitor?.thumbnail_text
          ? 'Both expose readable on-image text where available'
          : 'Thumbnail images are shown; on-image text was not read for every video',
      badge: competitor?.thumbnail_text && !yours?.thumbnail_text
        ? { kind: 'better' as const, text: 'Competitor better' }
        : { kind: 'same' as const, text: 'Same' },
    },
    {
      icon: 'ClockIcon',
      label: 'Video Length',
      detail: `${lengthLabel(yours || {}) || '—'} vs ${lengthLabel(competitor || {}) || '—'}`,
      badge: Number(competitor?.duration_seconds || 0) > Number(yours?.duration_seconds || 0)
        ? { kind: 'better' as const, text: 'Competitor longer' }
        : Number(yours?.duration_seconds || 0) > Number(competitor?.duration_seconds || 0)
          ? { kind: 'yours' as const, text: 'Yours longer' }
          : { kind: 'same' as const, text: 'Same' },
    },
    {
      icon: 'RectangleStackIcon',
      label: 'Topics Covered',
      detail: yours?.topic_name || competitor?.topic_name
        ? `${yours?.topic_name || '—'} vs ${competitor?.topic_name || '—'}`
        : 'Both cover similar product review themes from titles and tags',
      badge: { kind: 'same' as const, text: 'Same' },
    },
  ];

  const shareYours = yours ? likesCommentsShare(yours) : null;
  const shareTheirs = competitor ? likesCommentsShare(competitor) : null;

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`${base}/channel-compare`} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-secondary">
            <Icon name="ArrowLeftIcon" size={16} /> Back to videos
          </Link>
          <h1 className="mt-3 font-bricolage text-2xl font-semibold text-slate-900">Video Comparison</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">Compare public performance, content, and likes + comments of the videos in this analysis.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={partnerBtnSecondary} disabled={!!busy} onClick={() => saveReport(false)}>
            <Icon name="BookmarkIcon" size={16} /> {busy === 'save' ? 'Saving…' : 'Save Comparison'}
          </button>
          <Link className={partnerBtnSecondary} href={`${base}/reports`}>View in Reports</Link>
        </div>
      </div>

      {error ? <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p> : null}
      {message ? <p className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{message}</p> : null}

      <div className="relative grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <VideoHero video={yours} tone="own" />
        <div className="hidden items-center justify-center lg:flex">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold uppercase tracking-wide text-slate-500 shadow-sm">VS</span>
        </div>
        <VideoHero video={competitor} tone="competitor" />
      </div>

      {pair.extras.length ? (
        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Also in this comparison</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pair.extras.map((video) => (
              <li key={video.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2">
                {video.thumbnail_url ? <img src={video.thumbnail_url} alt="" className="h-12 w-[4.5rem] rounded-lg object-cover" /> : <span className="h-12 w-[4.5rem] rounded-lg bg-slate-100" />}
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-medium text-slate-800">{video.title}</p>
                  <p className="text-xs text-slate-400">{compactCount(video.view_count)} views · {video.relationship === 'own' ? 'You' : video.channel_name || 'Competitor'}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-1 border-b border-slate-100">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold ${tab === item.id ? 'border-secondary text-secondary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <Icon name={item.icon} size={16} /> {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-50 px-5 py-4">
            <Icon name="ChartBarIcon" size={18} className="text-secondary" />
            <div>
              <h2 className="font-bricolage text-base font-semibold text-slate-900">Performance Overview</h2>
              <p className="text-xs text-slate-400">Public Data API counts. Difference is competitor versus your video.</p>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3">Metric</th>
                <th className="px-5 py-3">Your Video</th>
                <th className="px-5 py-3">Competitor Video</th>
                <th className="px-5 py-3">Difference</th>
              </tr>
            </thead>
            <tbody>
              {[
                { icon: 'EyeIcon', label: 'Views', key: 'view_count' },
                { icon: 'HandThumbUpIcon', label: 'Likes', key: 'like_count' },
                { icon: 'ChatBubbleLeftIcon', label: 'Comments', key: 'comment_count' },
                { icon: 'UserPlusIcon', label: 'Subscribers', key: 'subscriber_count' },
              ].map((row) => (
                <tr key={row.key} className="border-t border-slate-50">
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                      <Icon name={row.icon} size={16} className="text-slate-400" /> {row.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-semibold text-slate-900">{compactCount(yours?.[row.key])}</td>
                  <td className="px-5 py-3 font-semibold text-slate-900">{compactCount(competitor?.[row.key])}</td>
                  <td className="px-5 py-3"><DiffCell yours={yours?.[row.key]} theirs={competitor?.[row.key]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {tab === 'content' ? (
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Icon name="DocumentTextIcon" size={18} className="text-secondary" />
            <div>
              <h2 className="font-bricolage text-base font-semibold text-slate-900">Content Analysis</h2>
              <p className="text-xs text-slate-400">Compared from public titles, thumbnails, duration, and topics.</p>
            </div>
          </div>
          <ul className="divide-y divide-slate-50">
            {contentRows.map((row) => (
              <li key={row.label} className="flex items-start justify-between gap-4 py-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                    <Icon name={row.icon} size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{row.label}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{row.detail}</p>
                  </div>
                </div>
                <span className={badgeClass(row.badge.kind)}>{row.badge.text}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tab === 'engagement' ? (
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Icon name="ChatBubbleLeftRightIcon" size={18} className="text-secondary" />
            <div>
              <h2 className="font-bricolage text-base font-semibold text-slate-900">Engagement Analysis</h2>
              <p className="text-xs text-slate-400">Likes + comments over views from public counts. Watch time is not in the Data API.</p>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-2 pr-4"> </th>
                <th className="py-2 pr-4">Your Video</th>
                <th className="py-2 pr-4">Competitor Video</th>
                <th className="py-2"> </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-50">
                <td className="py-3 pr-4 font-medium text-slate-700">Likes + comments / views</td>
                <td className="py-3 pr-4 font-semibold">{shareYours == null ? '—' : `${shareYours}%`}</td>
                <td className="py-3 pr-4 font-semibold">{shareTheirs == null ? '—' : `${shareTheirs}%`}</td>
                <td className="py-3">
                  {shareYours != null && shareTheirs != null ? (
                    <span className={badgeClass(shareYours >= shareTheirs ? 'yours' : 'better')}>{shareYours >= shareTheirs ? 'Higher' : 'Competitor higher'}</span>
                  ) : null}
                </td>
              </tr>
              <tr className="border-t border-slate-50">
                <td className="py-3 pr-4 font-medium text-slate-700">Likes + comments</td>
                <td className="py-3 pr-4 font-semibold">{compactCount(yours ? likesPlusComments(yours) : null)}</td>
                <td className="py-3 pr-4 font-semibold">{compactCount(competitor ? likesPlusComments(competitor) : null)}</td>
                <td />
              </tr>
              <tr className="border-t border-slate-50">
                <td className="py-3 pr-4 font-medium text-slate-700">Average view duration</td>
                <td className="py-3 pr-4 text-slate-400">Not in Data API</td>
                <td className="py-3 pr-4 text-slate-400">Not in Data API</td>
                <td />
              </tr>
              <tr className="border-t border-slate-50">
                <td className="py-3 pr-4 font-medium text-slate-700">Audience retention</td>
                <td className="py-3 pr-4 text-slate-400">Not in Data API</td>
                <td className="py-3 pr-4 text-slate-400">Not in Data API</td>
                <td />
              </tr>
            </tbody>
          </table>
        </section>
      ) : null}

      {tab === 'audience' ? (
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="font-bricolage text-base font-semibold text-slate-900">Audience</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Age, gender, geography, and devices from YouTube Analytics are not available on this integration. Goals you chose when generating the analysis remain planning targets, not measured audience mix.
          </p>
        </section>
      ) : null}

      {tab === 'seo' ? (
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="font-bricolage text-base font-semibold text-slate-900">SEO & Tags</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {[{ label: 'Your video', video: yours }, { label: 'Competitor video', video: competitor }].map((column) => (
              <div key={column.label} className="rounded-xl border border-slate-100 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{column.label}</p>
                <p className="mt-2 text-sm font-medium text-slate-800">{column.video?.title || '—'}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(Array.isArray(column.video?.tags) ? column.video.tags : []).length
                    ? column.video.tags.map((tag: string) => (
                      <span key={tag} className="rounded-full bg-slate-50 px-2.5 py-1 text-xs text-slate-600">{tag}</span>
                    ))
                    : <span className="text-sm text-slate-400">No public tags</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-4 rounded-2xl border border-sky-100 bg-sky-50/70 p-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-800">
            <Icon name="LightBulbIcon" size={16} /> Key Insights
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{insight}</p>
          {observations[0]?.action ? <p className="mt-2 text-sm text-slate-600">{observations[0].action}</p> : null}
        </div>
        <button type="button" className={partnerBtnPrimary} disabled={!!busy} onClick={() => saveReport(true)}>
          <Icon name="SparklesIcon" size={16} /> {busy === 'download' ? 'Generating…' : 'Generate Report'}
        </button>
      </section>
    </div>
  );
}
