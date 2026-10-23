'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminBadge from '@/components/admin/AdminBadge';
import AdminButton from '@/components/admin/AdminButton';
import { DATE_PRESETS, applyPreset, type ResearchFilterOptions } from '@/components/admin/youtube/research-ui';
import { metric, ProjectRequired, useProjectId, yt } from '@/components/admin/youtube/YoutubeFrame';
import Icon from '@/components/ui/AppIcon';

const selectClass = 'mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800';

type VideoRow = {
  id: string;
  title?: string | null;
  youtube_video_id?: string;
  thumbnail_url?: string | null;
  duration_label?: string;
  watch_url?: string | null;
  relationship?: string | null;
  channel_name?: string | null;
  content_label?: string | null;
  published_at?: string | null;
  view_count?: number | null;
  like_count?: number | null;
  comment_count?: number | null;
  note?: string;
};

function ChannelCell({ video }: { video: VideoRow }) {
  const own = video.relationship === 'own';
  return (
    <span className="flex flex-col gap-1">
      <AdminBadge variant={own ? 'indigo' : 'sky'}>{own ? 'Own' : 'Competitor'}</AdminBadge>
      <span className="text-xs text-slate-500">{video.channel_name || '—'}</span>
    </span>
  );
}

function AnalysisTable({
  rows,
  empty,
  noteHeading,
  actionLabel,
  onAction,
  busyId,
  maxHeight,
}: {
  rows: VideoRow[];
  empty: string;
  noteHeading: string;
  actionLabel: string;
  onAction: (id: string) => void;
  busyId: string;
  maxHeight: string;
}) {
  if (!rows.length) return <p className="px-5 py-8 text-sm text-slate-500">{empty}</p>;
  return (
    <div className={`overflow-auto ${maxHeight}`}>
      <table className="w-full min-w-[1080px] text-sm">
        <thead className="sticky top-0 bg-white">
          <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
            {['#', 'Video', 'Channel', 'Type', 'Published on', 'Views', 'Likes', 'Comments', noteHeading, 'Action'].map((heading) => (
              <th key={heading} className="whitespace-nowrap px-3 py-3 font-semibold">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((video, index) => (
            <tr key={video.id} className="border-t border-slate-100 align-top">
              <td className="px-3 py-3 text-slate-400">{index + 1}</td>
              <td className="px-3 py-3">
                <span className="flex items-center gap-3">
                  <span className="relative h-12 w-[4.5rem] shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {video.thumbnail_url ? <img src={video.thumbnail_url} alt="" className="h-full w-full object-cover" /> : null}
                    {video.duration_label ? <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 text-[10px] font-semibold text-white">{video.duration_label}</span> : null}
                  </span>
                  <a className="max-w-[220px] font-medium leading-snug text-slate-900 hover:text-secondary" href={video.watch_url || '#'} target="_blank" rel="noreferrer">
                    {video.title || video.youtube_video_id}
                  </a>
                </span>
              </td>
              <td className="px-3 py-3"><ChannelCell video={video} /></td>
              <td className="px-3 py-3 text-slate-600">{video.content_label || '—'}</td>
              <td className="whitespace-nowrap px-3 py-3 text-slate-500">{video.published_at || '—'}</td>
              <td className="px-3 py-3">{metric(video.view_count)}</td>
              <td className="px-3 py-3">{metric(video.like_count)}</td>
              <td className="px-3 py-3">{metric(video.comment_count)}</td>
              <td className="max-w-[220px] px-3 py-3 text-xs leading-5 text-slate-600">{video.note || '—'}</td>
              <td className="px-3 py-3">
                <AdminButton size="sm" variant={actionLabel === 'Analyze Gap' ? 'primary' : 'secondary'} disabled={busyId === video.id} onClick={() => onAction(video.id)}>
                  {busyId === video.id ? '…' : actionLabel}
                </AdminButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Analysis() {
  const projectId = useProjectId();
  const [options, setOptions] = useState<ResearchFilterOptions>({});
  const [channelIds, setChannelIds] = useState('');
  const [preset, setPreset] = useState('30');
  const [topicId, setTopicId] = useState('');
  const [content, setContent] = useState('');
  const [q, setQ] = useState('');
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [summary, setSummary] = useState<Record<string, any> | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [highOpen, setHighOpen] = useState(false);
  const [lowOpen, setLowOpen] = useState(false);
  const [compare, setCompare] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyVideo, setBusyVideo] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const query = useMemo(() => {
    const dates = applyPreset(preset);
    return { channelIds, topicId, content, q, from: dates.from, to: dates.to };
  }, [channelIds, topicId, content, q, preset]);

  const withNotes = (rows: VideoRow[]) => rows.map((row) => (notes[row.id] ? { ...row, note: notes[row.id] } : row));

  const load = async (next = query) => {
    const params = new URLSearchParams({ lens: 'why', limit: '12', ...next });
    const body = await yt(`projects/${projectId}/analysis?${params}`);
    setData(body);
    setNotes({});
    setSummary(null);
    setDetailOpen(false);
  };

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      try {
        const [filterRows] = await Promise.all([yt(`projects/${projectId}/filters`)]);
        setOptions(filterRows);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load analysis');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const analyze = async () => {
    try {
      setBusy(true);
      setError('');
      await load(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not analyse');
    } finally {
      setBusy(false);
    }
  };

  const summarize = async () => {
    try {
      setBusy(true);
      setError('');
      const body = await yt(`projects/${projectId}/analysis/summarize`, { method: 'POST', body: JSON.stringify(query) });
      setData(body);
      setSummary(body.summary || null);
      setDetailOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not summarise with AI');
    } finally {
      setBusy(false);
    }
  };

  const videoNote = async (id: string, mode: 'high' | 'gap') => {
    try {
      setBusyVideo(id);
      setError('');
      const body = await yt(`projects/${projectId}/analysis/video`, { method: 'POST', body: JSON.stringify({ ...query, videoId: id, mode }) });
      setNotes((current) => ({ ...current, [id]: body.note }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not summarise this video');
    } finally {
      setBusyVideo('');
    }
  };

  const high = withNotes(data?.high || []);
  const low = withNotes(data?.low || []);
  const highRows = highOpen ? high : high.slice(0, 5);
  const lowRows = lowOpen ? low : low.slice(0, 5);
  const insights = data?.insights || [];
  const bannerHeadline = summary?.headline || insights[0]?.title || 'Run Analyze to rank public views, likes, and comments.';
  const bannerBody = summary?.body || data?.observations?.[0] || 'These figures are public YouTube Data API counts for videos in this project, not YouTube Analytics.';

  return (
    <div className="space-y-4">
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}

      <section className="sticky top-[var(--yt-sticky)] z-30 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-bricolage text-[15px] font-semibold text-slate-900">AI Analysis Filters</h2>
        <p className="mt-0.5 text-xs text-slate-400">Adjust filters to analyse videos and get AI-powered insights.</p>
        <div className="mt-3 grid gap-3 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
          <label className="text-xs font-semibold text-slate-500">
            Channel
            <select className={selectClass} value={channelIds} onChange={(event) => setChannelIds(event.target.value)}>
              <option value="">All Channels</option>
              {(options.channels || []).map((channel) => <option key={channel.id} value={channel.id}>{channel.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Date range
            <select className={selectClass} value={preset} onChange={(event) => setPreset(event.target.value)}>
              {DATE_PRESETS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Topic
            <select className={selectClass} value={topicId} onChange={(event) => setTopicId(event.target.value)}>
              <option value="">All Topics</option>
              {(options.topics || []).map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Content type
            <select className={selectClass} value={content} onChange={(event) => setContent(event.target.value)}>
              <option value="">All Types</option>
              <option value="video">Videos</option>
              <option value="short">Shorts</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Keyword (optional)
            <input className={selectClass} placeholder="e.g. diabetes, surgery, tips…" value={q} onChange={(event) => setQ(event.target.value)} />
          </label>
          <div className="flex items-end">
            <AdminButton variant="primary" className="h-11 w-full min-w-[7.5rem]" disabled={busy} onClick={analyze}>{busy ? 'Analysing…' : 'Analyze'}</AdminButton>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-orange-100 bg-orange-50 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-secondary">
              <Icon name="SparklesIcon" size={18} /> AI Summary
            </p>
            <h3 className="mt-1 font-bricolage text-lg font-semibold text-slate-900">{bannerHeadline}</h3>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">{bannerBody}</p>
          </div>
          <AdminButton onClick={summary ? () => setDetailOpen((open) => !open) : summarize} disabled={busy}>
            <Icon name="DocumentTextIcon" size={16} /> {summary ? (detailOpen ? 'Hide detailed AI report' : 'View detailed AI report') : 'View detailed AI report'}
          </AdminButton>
        </div>
        {detailOpen && summary ? (
          <div className="mt-4 grid gap-4 border-t border-orange-100 pt-4 text-sm text-slate-700 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Why more engagement</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">{(summary.why_high || []).map((item: string) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Why little engagement</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">{(summary.why_low || []).map((item: string) => <li key={item}>{item}</li>)}</ul>
            </div>
            {(summary.suggestions || []).length ? (
              <div className="md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">What to test</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">{summary.suggestions.map((item: string) => <li key={item}>{item}</li>)}</ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {insights.map((card: { id: string; icon: string; title: string; body: string }) => (
          <article key={card.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-secondary">
              <Icon name={card.icon} size={18} />
            </span>
            <h3 className="mt-3 text-sm font-semibold text-slate-900">{card.title}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">{card.body}</p>
          </article>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
          <div>
            <h2 className="inline-flex items-center gap-2 font-bricolage text-[15px] font-semibold text-slate-900">
              <Icon name="TrophyIcon" size={18} className="text-amber-500" /> Highest engagement videos
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">These videos perform the best in your selected filters. See what’s working and why.</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-400">{high.length} videos</span>
            {high.length > 5 ? (
              <button type="button" className="font-semibold text-secondary" onClick={() => setHighOpen((open) => !open)}>{highOpen ? 'Show less' : 'View all'}</button>
            ) : (
              <Link className="font-semibold text-secondary" href="/admin/youtube-research/videos">View all</Link>
            )}
          </div>
        </div>
        <AnalysisTable
          rows={highRows}
          empty="Import and refresh videos, then click Analyze."
          noteHeading="Why it performed well"
          actionLabel="Summarise"
          onAction={(id) => videoNote(id, 'high')}
          busyId={busyVideo}
          maxHeight={highOpen ? 'max-h-[28rem]' : 'max-h-[24rem]'}
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
          <div>
            <h2 className="font-bricolage text-[15px] font-semibold text-slate-900">No / Low engagement videos</h2>
            <p className="mt-0.5 text-xs text-slate-400">These videos have lower engagement. Compare with top performing content to find improvement opportunities.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-sky-700">
              <input type="checkbox" className="rounded border-slate-300 text-secondary" checked={compare} onChange={(event) => setCompare(event.target.checked)} />
              Compare with top performers
            </label>
            <span className="text-slate-400">{low.length} videos</span>
            {low.length > 5 ? (
              <button type="button" className="font-semibold text-secondary" onClick={() => setLowOpen((open) => !open)}>{lowOpen ? 'Show less' : 'View all'}</button>
            ) : (
              <Link className="font-semibold text-secondary" href="/admin/youtube-research/videos">View all</Link>
            )}
          </div>
        </div>
        <AnalysisTable
          rows={lowRows}
          empty="No videos with views and little interaction in this filter."
          noteHeading={compare ? 'Key gaps vs top performers' : 'Key gaps and improvement opportunities'}
          actionLabel="Analyze Gap"
          onAction={(id) => videoNote(id, 'gap')}
          busyId={busyVideo}
          maxHeight={lowOpen ? 'max-h-[28rem]' : 'max-h-[24rem]'}
        />
      </section>
    </div>
  );
}

export default function Page() {
  return (
    <ProjectRequired>
      <Analysis />
    </ProjectRequired>
  );
}
