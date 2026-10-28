'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AnalyseModal, { type AnalyseConfig } from '@/components/admin/youtube/AnalyseModal';
import FetchVideosOverlay from '@/components/admin/youtube/FetchVideosOverlay';
import { saveAnalysisAsReport, saveAndDownloadAnalysisReport } from '@/components/admin/youtube/research-ui';
import { useProjectId, useYoutubePageBase, yt } from '@/components/admin/youtube/YoutubeFrame';
import { partnerBtnPrimary, partnerBtnSecondary } from '@/components/partner/PartnerUi';
import Icon from '@/components/ui/AppIcon';
import NavIcon from '@/components/ui/NavIcon';
import SafeImage from '@/components/ui/SafeImage';
import VideoThumb from '@/components/admin/youtube/VideoThumb';
import {
  PRIMARY_GOALS,
  compactCount,
  compareThumbnailReadings,
  displayChannel,
  displayTitle,
  formatPublished,
  leaderFor,
  likesCommentsShare,
  likesPlusComments,
  pctDiff,
  shortTitle,
  thumbnailWordSet,
  videoAccent,
} from '@/lib/youtube/analysis-display';
import { lengthLabel, parseTags } from '@/lib/youtube/parse';

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'ChartBarIcon' },
  { id: 'thumbnails', label: 'Thumbnails', icon: 'PhotoIcon' },
  { id: 'content', label: 'Content', icon: 'DocumentTextIcon' },
  { id: 'engagement', label: 'Engagement', icon: 'ChatBubbleLeftRightIcon' },
  { id: 'audience', label: 'Audience', icon: 'UserGroupIcon' },
  { id: 'seo', label: 'SEO & Tags', icon: 'HashtagIcon' },
] as const;

function Chip({ icon, label, value, tone }: { icon: string; label: string; value: string; tone: string }) {
  return (
    <div className={`flex min-w-0 items-center gap-2 rounded-xl px-3 py-2 ${tone}`}>
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/80">
        <Icon name={icon} size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] opacity-70">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function ChannelMark({ video }: { video: Record<string, any> }) {
  const name = displayChannel(video);
  const fallback = (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[9px] font-semibold text-slate-500">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
  if (video.channel_thumbnail_url) {
    return <SafeImage src={video.channel_thumbnail_url} alt="" className="h-5 w-5 rounded-full object-cover" fallback={fallback} />;
  }
  return fallback;
}

function VideoIdent({ video }: { video: Record<string, any> }) {
  return (
    <div className="flex min-w-[11rem] max-w-[16rem] items-center gap-2">
      <span className="relative h-10 w-[3.6rem] shrink-0 overflow-hidden rounded-md bg-slate-100">
        <VideoThumb youtubeId={video.youtube_video_id} src={video.thumbnail_url} className="h-full w-full object-cover" alt="" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-800" title={displayTitle(video)}>{shortTitle(video)}</p>
        <p className="flex min-w-0 items-center gap-1 text-[11px] text-slate-500">
          <ChannelMark video={video} />
          <span className="truncate">{displayChannel(video)}</span>
        </p>
      </div>
    </div>
  );
}

function VideoHero({ video, index }: { video: Record<string, any>; index: number }) {
  const accent = videoAccent(index);
  return (
    <article className={`overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm ring-1 ${accent.ring}`}>
      <div className={`h-1.5 ${accent.bar}`} />
      <div className="relative mx-4 mt-4 overflow-hidden rounded-xl bg-slate-100">
        <VideoThumb youtubeId={video.youtube_video_id} src={video.thumbnail_url} className="aspect-video w-full object-cover" alt="" />
        {lengthLabel(video) ? (
          <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            {lengthLabel(video)}
          </span>
        ) : null}
      </div>
      <div className="space-y-3 p-4">
        <h3 className="line-clamp-2 font-bricolage text-base font-semibold text-slate-900" title={displayTitle(video)}>{shortTitle(video, 72)}</h3>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ChannelMark video={video} />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-700">{displayChannel(video)}</p>
            <p>Published · {formatPublished(video.published_at)}</p>
          </div>
        </div>
        {video.description ? <p className="line-clamp-2 text-sm leading-5 text-slate-500">{video.description}</p> : null}
      </div>
    </article>
  );
}

function CompareBars({ videos, metric }: { videos: Record<string, any>[]; metric: string }) {
  const max = Math.max(...videos.map((video) => Number(video[metric] || 0)), 1);
  const winner = leaderFor(videos, metric);
  return (
    <div className="space-y-2">
      {videos.map((video, index) => {
        const value = Number(video[metric] || 0);
        const accent = videoAccent(index);
        const lead = winner && String(winner.id) === String(video.id);
        return (
          <div key={String(video.id || index)}>
            <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
              <span className="truncate font-medium text-slate-600">{shortTitle(video)} · {displayChannel(video)}</span>
              <span className={`font-semibold ${lead ? 'text-emerald-600' : 'text-slate-700'}`}>{compactCount(value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${accent.bar}`} style={{ width: `${Math.max(4, (value / max) * 100)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function videoTags(video: Record<string, any>) {
  return parseTags(video.tags);
}

function topicLabel(url: string) {
  try {
    const path = new URL(url).pathname.split('/').filter(Boolean).pop() || url;
    return decodeURIComponent(path).replace(/_/g, ' ');
  } catch {
    return url;
  }
}

function relatedVideos(item: Record<string, any>, videos: Record<string, any>[]) {
  const ids = [item.video_id, item.videoId, ...(Array.isArray(item.video_ids) ? item.video_ids : [])].map((value) => String(value || '')).filter(Boolean);
  if (!ids.length) return videos;
  const matched = videos.filter((video) => ids.includes(String(video.id)) || ids.includes(String(video.youtube_video_id)));
  return matched.length ? matched : videos;
}

export default function AnalysisComplete({
  analysis,
}: {
  analysis: Record<string, any>;
  onStatus?: (id: string, status: string) => void;
}) {
  const projectId = useProjectId();
  const base = useYoutubePageBase();
  const [current, setCurrent] = useState(analysis);
  useEffect(() => setCurrent(analysis), [analysis]);
  const videos: Record<string, any>[] = Array.isArray(current?.evidence?.videos) ? current.evidence.videos : [];
  const result = current?.result || {};
  const config = current?.config || {};
  const insights = result.insights && typeof result.insights === 'object' ? result.insights : null;
  const guides = Array.isArray(insights?.guides) ? insights.guides : [];
  const report = insights?.report && typeof insights.report === 'object' ? insights.report : null;
  const hasInsights = Boolean(
    insights && (guides.length || report || (Array.isArray(insights.observations) && insights.observations.length) || insights.summary?.headline),
  );
  const briefs = Array.isArray(result.video_briefs) ? result.video_briefs : [];
  const recommendations = Array.isArray(current?.actions) && current.actions.length
    ? current.actions
    : Array.isArray(insights?.recommendations) ? insights.recommendations : [];
  const [tab, setTab] = useState<string>('overview');
  const tabs = hasInsights ? [...TABS, { id: 'insights', label: 'Key Insights', icon: 'LightBulbIcon' }] : [...TABS];
  const openTab = (id: string) => {
    const y = typeof window !== 'undefined' ? window.scrollY : 0;
    setTab(id);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: y });
      });
    });
  };
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [insightsOpen, setInsightsOpen] = useState(false);

  const pair = videos.length === 2;
  const thumbReadings = useMemo(() => compareThumbnailReadings(videos, briefs), [videos, briefs]);
  const goals = Array.isArray(config.goals) ? config.goals.map(String) : [];
  const goalLabels = PRIMARY_GOALS.filter((goal) => goals.includes(goal.id));

  const runInsights = async (config: AnalyseConfig) => {
    setBusy('insights');
    setError('');
    try {
      const next = await yt(`projects/${projectId}/ai-analyses/${current.id}/insights`, {
        method: 'POST',
        body: JSON.stringify({
          ...config,
          source: 'selected',
          videoIds: videos.map((video) => video.id),
          outputs: ['improve_existing', 'gap_report'],
        }),
      });
      setCurrent(next);
      setInsightsOpen(false);
      setTab('insights');
      setMessage('Key insights are ready in the Key Insights tab.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate key insights');
    } finally {
      setBusy('');
    }
  };

  const saveReport = async (download: boolean) => {
    setBusy(download ? 'download' : 'save');
    setError('');
    setMessage('');
    try {
      if (download) await saveAndDownloadAnalysisReport(projectId, current);
      else await saveAnalysisAsReport(projectId, current);
      setMessage(download ? 'Report downloaded and saved to Reports.' : 'Comparison saved to Reports.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the report');
    } finally {
      setBusy('');
    }
  };

  const overviewRows = [
    { icon: 'EyeIcon', label: 'Views', key: 'view_count', tone: 'text-sky-600' },
    { icon: 'HandThumbUpIcon', label: 'Likes', key: 'like_count', tone: 'text-violet-600' },
    { icon: 'ChatBubbleLeftRightIcon', label: 'Comments', key: 'comment_count', tone: 'text-rose-600' },
  ];

  const wordSets = thumbReadings.map((item) => thumbnailWordSet(item.stats.text));
  const sharedThumbWords = [...(wordSets[0] || new Set())].filter((word) => wordSets.every((set) => set.has(word)));

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="min-w-0 font-bricolage text-2xl font-semibold text-slate-900">{current?.name || 'Video comparison'}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={partnerBtnPrimary} onClick={() => setInsightsOpen(true)}>
            <Icon name="LightBulbIcon" size={16} /> {hasInsights ? 'Refresh key insights' : 'Key Insights'}
          </button>
          <button type="button" className={partnerBtnSecondary} disabled={!!busy} onClick={() => saveReport(false)}>
            <Icon name="BookmarkIcon" size={16} /> {busy === 'save' ? 'Saving…' : 'Save Comparison'}
          </button>
          <Link className={partnerBtnSecondary} href={`${base}/reports`}>View in Reports</Link>
        </div>
      </div>

      {error ? <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p> : null}
      {message ? <p className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{message}</p> : null}

      {!videos.length ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          This analysis has no videos stored in evidence yet.
        </p>
      ) : (
        <>
          <div className="sticky top-[var(--yt-sticky)] z-30 -mx-4 h-14 border-y border-slate-200 bg-white px-4 shadow-[0_8px_16px_-12px_rgba(15,23,42,0.35)] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="flex h-full flex-nowrap gap-1 overflow-x-auto">
              {tabs.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openTab(item.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-semibold ${tab === item.id ? 'border-secondary text-secondary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  <NavIcon name={item.icon} itemKey={item.id} delay={index * 90} className="h-7 w-7 rounded-lg" size={14} /> {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-[calc(100dvh-var(--yt-sticky)-3.5rem)] [overflow-anchor:none]">
          {tab === 'overview' ? (
            <div className="space-y-4">
          <div className={`relative grid gap-4 ${pair ? 'lg:grid-cols-[1fr_auto_1fr]' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
            {videos.map((video, index) => (
              <div key={String(video.id || index)} className="contents">
                <VideoHero video={video} index={index} />
                {pair && index === 0 ? (
                  <div className="hidden items-center justify-center lg:flex">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold uppercase tracking-wide text-slate-500 shadow-sm">VS</span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-50 px-5 py-4">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <Icon name="ChartBarIcon" size={18} />
                </span>
                <div>
                  <h2 className="font-bricolage text-base font-semibold text-slate-900">Performance overview</h2>
                  <p className="text-xs text-slate-400">Public Data API counts for every video in this run. Highlight is the leader in this set.</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-3">Metric</th>
                      {videos.map((video, index) => (
                        <th key={String(video.id || index)} className="px-5 py-3 font-normal">
                          <VideoIdent video={video} />
                        </th>
                      ))}
                      {pair ? <th className="px-5 py-3">Difference</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {overviewRows.map((row) => {
                      const winner = leaderFor(videos, row.key);
                      return (
                        <tr key={row.key} className="border-t border-slate-50">
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                              <Icon name={row.icon} size={16} className={row.tone} /> {row.label}
                            </span>
                          </td>
                          {videos.map((video, index) => {
                            const lead = winner && String(winner.id) === String(video.id) && Number(video[row.key] || 0) > 0;
                            return (
                              <td key={String(video.id || index)} className={`px-5 py-3 font-semibold ${lead ? 'text-emerald-600' : 'text-slate-900'}`}>
                                {compactCount(video[row.key])}
                                {lead ? <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Lead</span> : null}
                              </td>
                            );
                          })}
                          {pair ? (
                            <td className="px-5 py-3">
                              {(() => {
                                const diff = pctDiff(videos[0]?.[row.key], videos[1]?.[row.key]);
                                if (diff == null) return <span className="text-slate-400">—</span>;
                                const up = diff > 0;
                                return (
                                  <span className={`inline-flex items-center gap-1 font-semibold ${up ? 'text-emerald-600' : diff < 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                                    {up ? '↗' : diff < 0 ? '↘' : '→'} {diff > 0 ? '+' : ''}{diff}% vs {shortTitle(videos[0])}
                                  </span>
                                );
                              })()}
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-4 border-t border-slate-50 p-5 md:grid-cols-3">
                {overviewRows.map((row) => (
                  <div key={row.key} className="rounded-xl border border-slate-100 p-4">
                    <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <Icon name={row.icon} size={16} className={row.tone} /> {row.label}
                    </p>
                    <CompareBars videos={videos} metric={row.key} />
                  </div>
                ))}
              </div>
            </section>
            </div>
          ) : null}

          {tab === 'thumbnails' ? (
              <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-50 px-5 py-4">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Icon name="PhotoIcon" size={18} />
                  </span>
                  <div>
                    <h2 className="font-bricolage text-base font-semibold text-slate-900">Thumbnail image comparison</h2>
                    <p className="text-xs text-slate-400">On-image text and scene readings stored from the thumbnail images.</p>
                  </div>
                </div>
                <div className={`grid gap-4 p-5 ${pair ? 'md:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
                  {thumbReadings.map((item, index) => {
                    const accent = videoAccent(index);
                    return (
                      <article key={String(item.video.id || index)} className={`rounded-2xl border border-slate-100 p-4 ring-1 ${accent.ring}`}>
                        <div className="space-y-3">
                          <VideoIdent video={item.video} />
                          <div className="grid grid-cols-2 gap-2">
                            <Chip icon="ChatBubbleBottomCenterTextIcon" label="Words on image" value={String(item.stats.words)} tone="bg-amber-50 text-amber-800" />
                            <Chip icon="HashtagIcon" label="Numbers on image" value={String(item.stats.numbers)} tone="bg-sky-50 text-sky-800" />
                            <Chip icon="QuestionMarkCircleIcon" label="Questions" value={String(item.stats.questions)} tone="bg-violet-50 text-violet-800" />
                            <Chip icon="MegaphoneIcon" label="All-caps words" value={String(item.stats.shout)} tone="bg-rose-50 text-rose-800" />
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              <Icon name="LanguageIcon" size={14} className="text-amber-500" /> Extracted thumbnail text
                            </p>
                            <p className="mt-1 text-sm leading-5 text-slate-800">{item.stats.text ? `“${item.stats.text}”` : 'No on-image text was read for this thumbnail.'}</p>
                            {item.overlap ? <p className="mt-1 text-xs text-emerald-700">{item.overlap} word{item.overlap === 1 ? '' : 's'} also appear in the video title.</p> : null}
                          </div>
                          <div className="rounded-xl bg-indigo-50/70 p-3">
                            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
                              <Icon name="EyeIcon" size={14} /> Image reading
                            </p>
                            <p className="mt-1 text-sm leading-5 text-slate-800">{item.scene || item.summary || 'The thumbnail image was not described for this video.'}</p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
                {sharedThumbWords.length ? (
                  <p className="border-t border-slate-50 px-5 py-3 text-sm text-slate-600">
                    Shared on-image words: {sharedThumbWords.map((word) => <span key={word} className="mr-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">{word}</span>)}
                  </p>
                ) : (
                  <p className="border-t border-slate-50 px-5 py-3 text-sm text-slate-500">No shared on-image words were found between these thumbnails.</p>
                )}
              </section>
          ) : null}

          {tab === 'content' ? (
              <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-50 px-5 py-4">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Icon name="DocumentTextIcon" size={18} />
                  </span>
                  <div>
                    <h2 className="font-bricolage text-base font-semibold text-slate-900">Content comparison</h2>
                    <p className="text-xs text-slate-400">Titles, duration, topics, and stored briefs for each video.</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        <th className="px-5 py-3">Aspect</th>
                        {videos.map((video, index) => (
                          <th key={String(video.id || index)} className="px-5 py-3 font-normal">
                            <VideoIdent video={video} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { icon: 'DocumentTextIcon', label: 'Title', render: (video: Record<string, any>) => displayTitle(video) },
                        { icon: 'HashtagIcon', label: 'Title length', render: (video: Record<string, any>) => `${displayTitle(video).length} characters` },
                        { icon: 'ClockIcon', label: 'Length', render: (video: Record<string, any>) => lengthLabel(video) || '—' },
                        { icon: 'RectangleStackIcon', label: 'Topic', render: (video: Record<string, any>) => video.topic_name || 'No topic stored' },
                        { icon: 'CalendarDaysIcon', label: 'Published', render: (video: Record<string, any>) => formatPublished(video.published_at) },
                        {
                          icon: 'BookOpenIcon',
                          label: 'Content summary',
                          render: (video: Record<string, any>) => {
                            const brief = briefs.find((item: Record<string, any>) => String(item.video_id) === String(video.id));
                            return brief?.content_summary || (video.description ? String(video.description).slice(0, 180) : 'No description stored');
                          },
                        },
                      ].map((row) => (
                        <tr key={row.label} className="border-t border-slate-50 align-top">
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                              <Icon name={row.icon} size={16} className="text-amber-500" /> {row.label}
                            </span>
                          </td>
                          {videos.map((video, index) => (
                            <td key={String(video.id || index)} className="px-5 py-3 text-slate-700">{row.render(video)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
          ) : null}

          {tab === 'engagement' ? (
            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-50 px-5 py-4">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <Icon name="ChatBubbleLeftRightIcon" size={18} />
                </span>
                <div>
                  <h2 className="font-bricolage text-base font-semibold text-slate-900">Engagement comparison</h2>
                  <p className="text-xs text-slate-400">Likes and comments from the public Data API. Watch time is not in this dataset.</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-3">Metric</th>
                      {videos.map((video, index) => (
                        <th key={String(video.id || index)} className="px-5 py-3 font-normal">
                          <VideoIdent video={video} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { icon: 'FireIcon', label: 'Likes + comments', value: (video: Record<string, any>) => compactCount(likesPlusComments(video)), numeric: (video: Record<string, any>) => Number(likesPlusComments(video) || 0) },
                      {
                        icon: 'ChartBarIcon',
                        label: 'Likes + comments / views',
                        value: (video: Record<string, any>) => {
                          const share = likesCommentsShare(video);
                          return share == null ? '—' : `${share}%`;
                        },
                        numeric: (video: Record<string, any>) => Number(likesCommentsShare(video) || 0),
                      },
                    ].map((row) => {
                      const scores = videos.map((video) => ('numeric' in row && row.numeric ? row.numeric(video) : Number(video[row.key || ''] || 0)));
                      const max = Math.max(...scores, 0);
                      return (
                        <tr key={row.label} className="border-t border-slate-50">
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                              <Icon name={row.icon} size={16} className="text-rose-500" /> {row.label}
                            </span>
                          </td>
                          {videos.map((video, index) => {
                            const lead = max > 0 && scores[index] === max;
                            return (
                              <td key={String(video.id || index)} className={`px-5 py-3 font-semibold ${lead ? 'text-emerald-600' : 'text-slate-900'}`}>
                                {row.value(video)}
                                {lead ? <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Lead</span> : null}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {tab === 'audience' ? (
            <section className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="px-5 py-4">
                  <h3 className="font-bricolage text-base font-semibold text-slate-900">Public channel comparison</h3>
                  <p className="text-xs text-slate-400">Only fields YouTube publishes on the channel or video: subscribers, default language, and country when present.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        <th className="px-5 py-3">Field</th>
                        {videos.map((video, index) => (
                          <th key={String(video.id || index)} className="px-5 py-3 font-normal">
                            <VideoIdent video={video} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-slate-50">
                        <td className="px-5 py-3 font-medium text-slate-700">Channel</td>
                        {videos.map((video, index) => (
                          <td key={String(video.id || index)} className="px-5 py-3">{displayChannel(video)}</td>
                        ))}
                      </tr>
                      <tr className="border-t border-slate-50">
                        <td className="px-5 py-3 font-medium text-slate-700">Subscribers</td>
                        {videos.map((video, index) => (
                          <td key={String(video.id || index)} className="px-5 py-3 font-semibold">{compactCount(video.subscriber_count)}</td>
                        ))}
                      </tr>
                      <tr className="border-t border-slate-50">
                        <td className="px-5 py-3 font-medium text-slate-700">Default language</td>
                        {videos.map((video, index) => (
                          <td key={String(video.id || index)} className="px-5 py-3">{video.default_language || video.default_audio_language || '—'}</td>
                        ))}
                      </tr>
                      {videos.some((video) => video.country || video.channel_country) ? (
                        <tr className="border-t border-slate-50">
                          <td className="px-5 py-3 font-medium text-slate-700">Country</td>
                          {videos.map((video, index) => (
                            <td key={String(video.id || index)} className="px-5 py-3">{video.country || video.channel_country || '—'}</td>
                          ))}
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : null}

          {tab === 'seo' ? (
            <section className="space-y-4">
              {(() => {
                const tagSets = videos.map((video) => videoTags(video));
                const shared = tagSets[0]?.filter((tag) => tagSets.every((set) => set.some((item) => item.toLowerCase() === tag.toLowerCase()))) || [];
                const available = [...new Set(tagSets.flat())];
                return (
                  <>
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-indigo-600">
                          <Icon name="HashtagIcon" size={18} />
                        </span>
                        <div>
                          <h2 className="font-bricolage text-base font-semibold text-slate-900">Available tags</h2>
                          <p className="text-xs text-slate-500">Every public tag YouTube returned for these videos. Shared tags are green.</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {available.length ? available.map((tag) => (
                          <span
                            key={tag}
                            className={`rounded-full px-2.5 py-1 text-xs ${shared.some((item) => item.toLowerCase() === tag.toLowerCase()) ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-slate-700'}`}
                          >
                            {tag}
                          </span>
                        )) : (
                          <p className="text-sm text-slate-500">YouTube did not return public tags for these videos. Tags are optional and only appear when the owner published them.</p>
                        )}
                      </div>
                    </div>
                    <div className={`grid gap-4 ${videos.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
                      {videos.map((video, index) => {
                        const tags = videoTags(video);
                        const accent = videoAccent(index);
                        const details = (video.public_details || {}) as Record<string, any>;
                        const topics = Array.isArray(details.topicCategories) ? details.topicCategories.map(String) : [];
                        return (
                          <div key={String(video.id || index)} className={`rounded-xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ${accent.ring}`}>
                            <div className="flex items-start justify-between gap-2">
                              <VideoIdent video={video} />
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${accent.chip}`}>{tags.length} tags</span>
                            </div>
                            <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                              <div><dt className="uppercase tracking-wide">Language</dt><dd className="font-medium text-slate-800">{video.default_language || video.default_audio_language || '—'}</dd></div>
                              <div><dt className="uppercase tracking-wide">Captions</dt><dd className="font-medium text-slate-800">{details.caption === true ? 'Public captions' : details.caption === false ? 'None listed' : '—'}</dd></div>
                              <div><dt className="uppercase tracking-wide">Definition</dt><dd className="font-medium text-slate-800">{details.definition ? String(details.definition).toUpperCase() : '—'}</dd></div>
                              <div><dt className="uppercase tracking-wide">Made for kids</dt><dd className="font-medium text-slate-800">{details.madeForKids === true ? 'Yes' : details.madeForKids === false ? 'No' : '—'}</dd></div>
                            </dl>
                            {topics.length ? (
                              <p className="mt-2 text-xs text-slate-500">Topics: {topics.map(topicLabel).join(' · ')}</p>
                            ) : null}
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {tags.length ? tags.map((tag) => (
                                <span
                                  key={tag}
                                  className={`rounded-full px-2.5 py-1 text-xs ${shared.some((item) => item.toLowerCase() === tag.toLowerCase()) ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-600'}`}
                                >
                                  {tag}
                                </span>
                              )) : <span className="text-sm text-slate-400">No public tags on this video</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </section>
          ) : null}

          {tab === 'insights' && hasInsights ? (
            <section className="space-y-4">
              <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-sky-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">YouTube Master · {report?.selected_goal || goalLabels[0]?.label || 'Selected goal'}</p>
                <h2 className="mt-1 font-bricolage text-xl font-semibold text-slate-900">
                  {insights?.summary?.headline || `How to improve ${goalLabels.map((goal) => goal.label.toLowerCase()).join(', ') || 'your selected goals'}`}
                </h2>
                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  {report?.overall_assessment || insights?.summary?.body || 'Follow the numbered steps. Public Data API evidence only unless authorized Analytics is present.'}
                </p>
              </div>
              {report?.findings?.length ? (
                <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <h3 className="font-bricolage text-base font-semibold text-slate-900">Key findings</h3>
                  <ol className="mt-3 space-y-3">
                    {report.findings.map((item: Record<string, any>, index: number) => (
                      <li key={item.title || index} className="flex gap-3">
                        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">{index + 1}</span>
                        <div>
                          <p className="font-semibold text-slate-900">{item.title}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p>
                          {item.evidence ? <p className="mt-1 text-xs text-slate-400">Evidence: {item.evidence}</p> : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                </article>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                {report?.working?.length ? (
                  <article className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
                    <h3 className="font-semibold text-emerald-900">What’s working</h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-900/80">{report.working.map((item: string) => <li key={item}>{item}</li>)}</ul>
                  </article>
                ) : null}
                {report?.improve?.length ? (
                  <article className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5">
                    <h3 className="font-semibold text-amber-900">What to improve</h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900/80">{report.improve.map((item: string) => <li key={item}>{item}</li>)}</ul>
                  </article>
                ) : null}
              </div>
              {report?.actions?.length ? (
                <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <h3 className="font-bricolage text-base font-semibold text-slate-900">Recommended actions</h3>
                  <div className="mt-3 space-y-3">
                    {report.actions.map((item: Record<string, any>, index: number) => (
                      <div key={item.title || index} className="rounded-xl border border-slate-100 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.priority === 'P1' ? 'bg-rose-100 text-rose-700' : item.priority === 'P3' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'}`}>{item.priority || 'P2'}</span>
                          <p className="font-semibold text-slate-900">{item.title}</p>
                        </div>
                        {item.problem ? <p className="mt-2 text-sm text-slate-600">{item.problem}</p> : null}
                        {item.how || item.change ? <p className="mt-1 text-sm text-slate-700">{item.how || item.change}</p> : null}
                        <p className="mt-2 text-xs text-slate-400">{[item.metric, item.review_period, item.confidence ? `Confidence: ${item.confidence}` : ''].filter(Boolean).join(' · ')}</p>
                      </div>
                    ))}
                  </div>
                </article>
              ) : null}
              {report?.creative && Object.values(report.creative).some((value: any) => Array.isArray(value) && value.length) ? (
                <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <h3 className="font-bricolage text-base font-semibold text-slate-900">Suggested creative improvements</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {Object.entries(report.creative).filter(([, value]) => Array.isArray(value) && value.length).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{key}</p>
                        <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">{(value as string[]).map((item) => <li key={item}>{item}</li>)}</ul>
                      </div>
                    ))}
                  </div>
                </article>
              ) : null}
              {report?.competitor_learnings?.length ? (
                <article className="rounded-2xl border border-sky-100 bg-sky-50/60 p-5">
                  <h3 className="font-semibold text-sky-900">Competitor learnings</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-sky-900/80">{report.competitor_learnings.map((item: string) => <li key={item}>{item}</li>)}</ul>
                </article>
              ) : null}
              {report?.success || report?.confidence ? (
                <article className="rounded-2xl border border-slate-100 bg-white p-5 text-sm text-slate-600">
                  {report.success ? <p><span className="font-semibold text-slate-900">How you’ll know it helped: </span>{report.success}</p> : null}
                  {report.confidence ? <p className="mt-2"><span className="font-semibold text-slate-900">Confidence: </span>{report.confidence}</p> : null}
                </article>
              ) : null}
              {(guides.length ? guides : videos.flatMap((video) => (Array.isArray(config.goals) ? config.goals : ['views']).map((goal: string) => ({
                goal,
                video_id: video.id,
                diagnosis: `${shortTitle(video)} · ${compactCount(video.view_count)} views, ${compactCount(video.like_count)} likes, ${compactCount(video.comment_count)} comments.`,
                steps: recommendations.filter((item: Record<string, any>) => !item.video_id || String(item.video_id) === String(video.id)).slice(0, 5).map((item: Record<string, any>) => ({
                  title: item.title,
                  detail: item.description,
                })),
              })))).map((guide: Record<string, any>, index: number) => {
                const video = videos.find((item) => String(item.id) === String(guide.video_id)) || relatedVideos(guide, videos)[0];
                const goal = PRIMARY_GOALS.find((item) => item.id === guide.goal);
                const steps = Array.isArray(guide.steps) ? guide.steps : [];
                return (
                  <article key={`${guide.goal}-${guide.video_id}-${index}`} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      {video ? <VideoIdent video={video} /> : null}
                      <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">{goal?.label || guide.goal}</span>
                    </div>
                    {guide.diagnosis ? <p className="mt-3 text-sm leading-6 text-slate-700">{guide.diagnosis}</p> : null}
                    <ol className="mt-4 space-y-3">
                      {steps.map((step: Record<string, any>, stepIndex: number) => (
                        <li key={`${step.title}-${stepIndex}`} className="flex gap-3">
                          <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">{stepIndex + 1}</span>
                          <div>
                            <p className="font-semibold text-slate-900">{step.title || step.do || `Step ${stepIndex + 1}`}</p>
                            {step.detail || step.why ? <p className="mt-1 text-sm leading-6 text-slate-600">{step.detail || step.why}</p> : null}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </article>
                );
              })}
            </section>
          ) : null}
          </div>
        </>
      )}

      {busy === 'save' || busy === 'download' ? <FetchVideosOverlay mode="report" /> : null}
      {insightsOpen ? (
        <AnalyseModal
          variant="insights"
          videos={videos}
          busy={busy === 'insights'}
          error={error}
          onClose={() => { if (busy !== 'insights') setInsightsOpen(false); }}
          onGenerate={runInsights}
        />
      ) : null}
    </div>
  );
}
