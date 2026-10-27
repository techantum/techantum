'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { saveAnalysisAsReport, saveAndDownloadAnalysisReport } from '@/components/admin/youtube/research-ui';
import { useProjectId, useYoutubePageBase } from '@/components/admin/youtube/YoutubeFrame';
import { partnerBtnPrimary, partnerBtnSecondary } from '@/components/partner/PartnerUi';
import Icon from '@/components/ui/AppIcon';
import NavIcon from '@/components/ui/NavIcon';
import SafeImage from '@/components/ui/SafeImage';
import VideoThumb from '@/components/admin/youtube/VideoThumb';
import {
  PRIMARY_GOALS,
  compactCount,
  comparativeInsightPoints,
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
import { lengthLabel } from '@/lib/youtube/parse';

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'ChartBarIcon' },
  { id: 'content', label: 'Content', icon: 'DocumentTextIcon' },
  { id: 'engagement', label: 'Engagement', icon: 'ChatBubbleLeftRightIcon' },
  { id: 'audience', label: 'Audience', icon: 'UserGroupIcon' },
  { id: 'seo', label: 'SEO & Tags', icon: 'HashtagIcon' },
  { id: 'insights', label: 'Key Insights', icon: 'LightBulbIcon' },
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
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Chip icon="EyeIcon" label="Views" value={compactCount(video.view_count)} tone="bg-sky-50 text-sky-800" />
          <Chip icon="HandThumbUpIcon" label="Likes" value={compactCount(video.like_count)} tone="bg-violet-50 text-violet-800" />
          <Chip icon="ChatBubbleLeftRightIcon" label="Comments" value={compactCount(video.comment_count)} tone="bg-rose-50 text-rose-800" />
          <Chip icon="UserGroupIcon" label="Subscribers" value={compactCount(video.subscriber_count)} tone="bg-amber-50 text-amber-800" />
        </div>
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

function relatedVideos(item: Record<string, any>, videos: Record<string, any>[]) {
  const ids = [item.video_id, item.videoId, ...(Array.isArray(item.video_ids) ? item.video_ids : [])].map((value) => String(value || '')).filter(Boolean);
  if (!ids.length) return videos;
  const matched = videos.filter((video) => ids.includes(String(video.id)) || ids.includes(String(video.youtube_video_id)));
  return matched.length ? matched : videos;
}

function listValue(value: unknown) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  const text = String(value || '').trim();
  return text ? text.split(/[,|]/).map((item) => item.trim()).filter(Boolean) : [];
}

export default function AnalysisComplete({
  analysis,
}: {
  analysis: Record<string, any>;
  onStatus?: (id: string, status: string) => void;
}) {
  const projectId = useProjectId();
  const base = useYoutubePageBase();
  const videos: Record<string, any>[] = Array.isArray(analysis?.evidence?.videos) ? analysis.evidence.videos : [];
  const result = analysis?.result || {};
  const config = analysis?.config || {};
  const observations = Array.isArray(result.observations) ? result.observations : [];
  const briefs = Array.isArray(result.video_briefs) ? result.video_briefs : [];
  const recommendations = Array.isArray(analysis?.actions) && analysis.actions.length
    ? analysis.actions
    : Array.isArray(result.recommendations) ? result.recommendations : [];
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('overview');
  const openTab = (id: (typeof TABS)[number]['id']) => {
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

  const pair = videos.length === 2;
  const metricPoints = useMemo(() => comparativeInsightPoints(videos), [videos]);
  const thumbReadings = useMemo(() => compareThumbnailReadings(videos, briefs), [videos, briefs]);
  const goals = Array.isArray(config.goals) ? config.goals.map(String) : [];
  const goalLabels = PRIMARY_GOALS.filter((goal) => goals.includes(goal.id));
  const channels = [...new Set(videos.map((video) => displayChannel(video)))];

  const insightColumns = videos.map((video) => {
    const points = [
      ...metricPoints.flatMap((point) => point.lines.filter((line) => line.includes(shortTitle(video)) || line.includes(displayTitle(video)))),
      ...observations.flatMap((item: Record<string, any>) => {
        const related = relatedVideos(item, videos);
        if (!related.some((entry) => String(entry.id) === String(video.id))) return [];
        const text = [item.headline, item.observation, item.evidence].filter(Boolean).join(' — ');
        return text ? [text] : [];
      }),
    ].filter(Boolean);
    return { video, points: [...new Set(points)].slice(0, 8) };
  });

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

  const overviewRows = [
    { icon: 'EyeIcon', label: 'Views', key: 'view_count', tone: 'text-sky-600' },
    { icon: 'HandThumbUpIcon', label: 'Likes', key: 'like_count', tone: 'text-violet-600' },
    { icon: 'ChatBubbleLeftRightIcon', label: 'Comments', key: 'comment_count', tone: 'text-rose-600' },
    { icon: 'UserGroupIcon', label: 'Channel subscribers', key: 'subscriber_count', tone: 'text-amber-600' },
  ];

  const audienceTargets = [
    { icon: 'CalendarDaysIcon', label: 'Age', values: listValue(config.targetAges?.length ? config.targetAges : config.targetAge) },
    { icon: 'UserIcon', label: 'Gender', values: listValue(config.targetGenders?.length ? config.targetGenders : config.targetGender) },
    { icon: 'GlobeAltIcon', label: 'Geography', values: listValue(config.geographies?.length ? config.geographies : config.targetGeography) },
    { icon: 'LanguageIcon', label: 'Languages', values: listValue(config.languages) },
    { icon: 'SparklesIcon', label: 'Interests', values: listValue(config.interests) },
    { icon: 'DevicePhoneMobileIcon', label: 'Devices', values: listValue(config.devices) },
  ].filter((row) => row.values.length);

  const wordSets = thumbReadings.map((item) => thumbnailWordSet(item.stats.text));
  const sharedThumbWords = [...(wordSets[0] || new Set())].filter((word) => wordSets.every((set) => set.has(word)));

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`${base}/channel-compare`} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-secondary">
            <Icon name="ArrowLeftIcon" size={16} /> Back to analysis list
          </Link>
          <h1 className="mt-3 font-bricolage text-2xl font-semibold text-slate-900">{analysis?.name || 'Video comparison'}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {videos.length} video{videos.length === 1 ? '' : 's'}
            {channels.length ? ` · ${channels.join(', ')}` : ''}
            {goalLabels.length ? ` · Goals: ${goalLabels.map((goal) => goal.label).join(', ')}` : ''}
          </p>
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

      {!videos.length ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          This analysis has no videos stored in evidence yet.
        </p>
      ) : (
        <>
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

          <div className="sticky top-[var(--yt-sticky)] z-30 -mx-4 h-14 border-y border-slate-200 bg-white px-4 shadow-[0_8px_16px_-12px_rgba(15,23,42,0.35)] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="flex h-full flex-nowrap gap-1 overflow-x-auto">
              {TABS.map((item, index) => (
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
              <div className="grid gap-4 border-t border-slate-50 p-5 md:grid-cols-2">
                {overviewRows.slice(0, 2).map((row) => (
                  <div key={row.key} className="rounded-xl border border-slate-100 p-4">
                    <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <Icon name={row.icon} size={16} className={row.tone} /> {row.label}
                    </p>
                    <CompareBars videos={videos} metric={row.key} />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {tab === 'content' ? (
            <div className="space-y-4">
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
                        { icon: 'ChatBubbleBottomCenterTextIcon', label: 'Thumbnail text', render: (video: Record<string, any>) => video.thumbnail_text ? `“${String(video.thumbnail_text)}”` : 'None read from the image' },
                        { icon: 'EyeIcon', label: 'Image scene', render: (video: Record<string, any>) => video.thumbnail_scene || 'No scene stored' },
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
            </div>
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
                      { icon: 'HeartIcon', label: 'Likes', value: (video: Record<string, any>) => compactCount(video.like_count), key: 'like_count' },
                      { icon: 'ChatBubbleLeftRightIcon', label: 'Comments', value: (video: Record<string, any>) => compactCount(video.comment_count), key: 'comment_count' },
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
                    <tr className="border-t border-slate-50">
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                          <Icon name="ClockIcon" size={16} className="text-slate-400" /> Average view duration
                        </span>
                      </td>
                      {videos.map((video, index) => (
                        <td key={String(video.id || index)} className="px-5 py-3 text-slate-400">Not in public Data API</td>
                      ))}
                    </tr>
                    <tr className="border-t border-slate-50">
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                          <Icon name="PresentationChartLineIcon" size={16} className="text-slate-400" /> Audience retention
                        </span>
                      </td>
                      {videos.map((video, index) => (
                        <td key={String(video.id || index)} className="px-5 py-3 text-slate-400">Not in public Data API</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-50 p-5">
                <CompareBars videos={videos} metric="like_count" />
              </div>
            </section>
          ) : null}

          {tab === 'audience' ? (
            <section className="space-y-4">
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Icon name="FlagIcon" size={18} />
                  </span>
                  <div>
                    <h2 className="font-bricolage text-base font-semibold text-slate-900">Targets saved on this analysis</h2>
                    <p className="text-xs text-slate-400">From the comparison form in the database — not measured YouTube Analytics demographics.</p>
                  </div>
                </div>
                {audienceTargets.length || goalLabels.length || config.audienceNotes ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {goalLabels.length ? (
                      <div className="rounded-xl bg-sky-50 p-4 text-sky-800">
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide"><Icon name="SparklesIcon" size={14} /> Goals</p>
                        <p className="mt-2 text-sm font-medium">{goalLabels.map((goal) => goal.label).join(', ')}</p>
                      </div>
                    ) : null}
                    {audienceTargets.map((row) => (
                      <div key={row.label} className="rounded-xl bg-slate-50 p-4">
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <Icon name={row.icon} size={14} className="text-indigo-500" /> {row.label}
                        </p>
                        <p className="mt-2 text-sm font-medium text-slate-800">{row.values.join(', ')}</p>
                      </div>
                    ))}
                    {config.audienceNotes ? (
                      <div className="rounded-xl bg-amber-50 p-4 text-amber-900 sm:col-span-2">
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide"><Icon name="PencilSquareIcon" size={14} /> Notes</p>
                        <p className="mt-2 text-sm">{String(config.audienceNotes)}</p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No audience targets were saved on this analysis.</p>
                )}
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="px-5 py-4">
                  <h3 className="font-bricolage text-base font-semibold text-slate-900">Public channel comparison</h3>
                  <p className="text-xs text-slate-400">Subscriber counts are the public channel field. Age, gender, geography, and devices are not returned by the Data API for these videos.</p>
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
                      {['Age mix', 'Gender mix', 'Geography', 'Devices'].map((label) => (
                        <tr key={label} className="border-t border-slate-50">
                          <td className="px-5 py-3 font-medium text-slate-700">{label}</td>
                          {videos.map((video, index) => (
                            <td key={String(video.id || index)} className="px-5 py-3 text-slate-400">Not in public Data API</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : null}

          {tab === 'seo' ? (
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Icon name="HashtagIcon" size={18} />
                </span>
                <div>
                  <h2 className="font-bricolage text-base font-semibold text-slate-900">SEO & tags comparison</h2>
                  <p className="text-xs text-slate-400">Public tags stored for each video. Shared tags appear in emerald.</p>
                </div>
              </div>
              {(() => {
                const sets = videos.map((video) => new Set((Array.isArray(video.tags) ? video.tags : []).map((tag: string) => String(tag).toLowerCase())));
                const shared = [...(sets[0] || new Set())].filter((tag) => sets.every((set) => set.has(tag)));
                return (
                  <div className={`grid gap-4 ${videos.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
                    {videos.map((video, index) => {
                      const tags: string[] = Array.isArray(video.tags) ? video.tags.map(String) : [];
                      const accent = videoAccent(index);
                      return (
                        <div key={String(video.id || index)} className={`rounded-xl border border-slate-100 p-4 ring-1 ${accent.ring}`}>
                          <div className="flex items-start justify-between gap-2">
                            <VideoIdent video={video} />
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${accent.chip}`}>{tags.length} tags</span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {tags.length ? tags.map((tag) => (
                              <span
                                key={tag}
                                className={`rounded-full px-2.5 py-1 text-xs ${shared.includes(tag.toLowerCase()) ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-600'}`}
                              >
                                {tag}
                              </span>
                            )) : <span className="text-sm text-slate-400">No public tags stored</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </section>
          ) : null}

          {tab === 'insights' ? (
            <section className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-violet-50 p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-sky-800">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                    <Icon name="LightBulbIcon" size={16} />
                  </span>
                  Key insights by video
                </p>
                <button type="button" className={partnerBtnPrimary} disabled={!!busy} onClick={() => saveReport(true)}>
                  <Icon name="SparklesIcon" size={16} /> {busy === 'download' ? 'Generating…' : 'Generate Report'}
                </button>
              </div>
              <div className={`mt-4 grid gap-4 ${pair ? 'md:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
                {insightColumns.map(({ video, points }, index) => {
                  const accent = videoAccent(index);
                  return (
                    <article key={String(video.id || index)} className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
                      <VideoIdent video={video} />
                      <ul className="mt-3 space-y-2">
                        {(points.length ? points : [`Public counts: ${compactCount(video.view_count)} views, ${compactCount(video.like_count)} likes, ${compactCount(video.comment_count)} comments.`]).map((line) => (
                          <li key={line} className="flex gap-2 text-sm leading-5 text-slate-600">
                            <Icon name="CheckCircleIcon" size={16} className={`mt-0.5 shrink-0 ${accent.icon}`} />
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  );
                })}
              </div>
              {recommendations.length ? (
                <div className="mt-4 rounded-xl border border-violet-100 bg-white/70 p-4">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-700">
                    <Icon name="BoltIcon" size={14} /> Next steps from this analysis
                  </p>
                  <ul className="mt-3 grid gap-2 md:grid-cols-2">
                    {recommendations.slice(0, 6).map((item: Record<string, any>, index: number) => {
                      const related = relatedVideos(item, videos)[0];
                      return (
                        <li key={String(item.id || item.title || index)} className="rounded-lg bg-violet-50/70 px-3 py-2 text-sm text-slate-700">
                          <span className="font-semibold text-slate-900">{item.title || item.action || 'Action'}</span>
                          {related ? <span className="mt-0.5 block text-xs text-slate-500">{shortTitle(related)} · {displayChannel(related)}</span> : null}
                          {item.description ? <span className="mt-1 block text-xs text-slate-500">{item.description}</span> : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}
          </div>
        </>
      )}
    </div>
  );
}
