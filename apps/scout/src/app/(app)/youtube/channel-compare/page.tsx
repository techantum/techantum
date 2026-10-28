'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AnalysisComplete from '@/components/admin/youtube/AnalysisComplete';
import FetchVideosOverlay from '@/components/admin/youtube/FetchVideosOverlay';
import PageLoader from '@/components/admin/youtube/PageLoader';
import { DATE_PRESETS, saveAndDownloadAnalysisReport } from '@/components/admin/youtube/research-ui';
import { allow, ProjectRequired, useProjectId, useYoutubeAccess, useYoutubePageBase, useYoutubeRailActions, yt } from '@/components/admin/youtube/YoutubeFrame';
import { partnerBtnPrimary, partnerBtnSecondary, partnerInput } from '@/components/partner/PartnerUi';
import Icon from '@/components/ui/AppIcon';
import VideoThumb from '@/components/admin/youtube/VideoThumb';
import { analysisStatusMeta } from '@/lib/youtube/analysis-display';

const PAGE_SIZE = 7;
const TONES = ['bg-violet-100 text-violet-700', 'bg-rose-100 text-rose-700', 'bg-sky-100 text-sky-700', 'bg-amber-100 text-amber-700', 'bg-emerald-100 text-emerald-700'];

function asList(payload: unknown): Record<string, any>[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object' && Array.isArray((payload as { rows?: unknown }).rows)) {
    return (payload as { rows: Record<string, any>[] }).rows;
  }
  return [];
}

function formatCreated(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) return String(value).slice(0, 16).replace('T', ' ');
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function cleanTitle(name?: string | null) {
  return String(name || 'Video comparison').replace(/\s*[·•\-–]\s*\d+\s*videos?\s*$/i, '').trim() || 'Video comparison';
}

function analysisKind(row: Record<string, any>) {
  const goals = Array.isArray(row.config?.goals) ? row.config.goals.map(String) : [];
  const name = String(row.name || '').toLowerCase();
  if (name.includes('gap') || goals.includes('discoverability')) return { label: 'Content Gap', className: 'bg-orange-50 text-orange-700', icon: 'LightBulbIcon' };
  if (name.includes('engagement') || goals.includes('engagement') || goals.includes('comments')) return { label: 'Engagement', className: 'bg-pink-50 text-pink-700', icon: 'HeartIcon' };
  if (name.includes('comparison') || (Array.isArray(row.videos) && row.videos.length > 1)) return { label: 'Comparison', className: 'bg-indigo-50 text-indigo-700', icon: 'ArrowsRightLeftIcon' };
  return { label: 'Performance', className: 'bg-violet-50 text-violet-700', icon: 'ChartBarIcon' };
}

function uniqueChannels(videos: Record<string, any>[]) {
  const seen = new Map<string, Record<string, any>>();
  videos.forEach((video) => {
    const key = String(video.channel_id || video.channel_name || video.id);
    if (!seen.has(key)) seen.set(key, video);
  });
  return [...seen.values()];
}

function VideoStack({ videos }: { videos: Record<string, any>[] }) {
  const shown = videos.slice(0, 3);
  const extra = videos.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((video, index) => (
        <span key={`${video.id}-${index}`} className={`inline-flex h-9 w-9 overflow-hidden rounded-lg border-2 border-white bg-slate-100 ${index ? '-ml-2' : ''}`}>
          <VideoThumb youtubeId={video.youtube_video_id} src={video.thumbnail_url} className="h-full w-full object-cover" alt="" />
        </span>
      ))}
      {extra > 0 ? (
        <span className="-ml-2 inline-flex h-9 w-9 items-center justify-center rounded-lg border-2 border-white bg-violet-50 text-[11px] font-semibold text-violet-700">
          +{extra}
        </span>
      ) : null}
    </div>
  );
}

function ChannelStack({ videos }: { videos: Record<string, any>[] }) {
  const channels = uniqueChannels(videos);
  return (
    <div className="flex items-center">
      {channels.map((channel, index) => (
        <span
          key={String(channel.channel_id || channel.id || index)}
          title={channel.relationship === 'own' ? 'You' : channel.channel_name || 'Channel'}
          className={`inline-flex h-9 w-9 overflow-hidden rounded-full border-2 border-white ${index ? '-ml-2' : ''} ${TONES[index % TONES.length]}`}
        >
          {channel.channel_thumbnail_url ? (
            <VideoThumb src={channel.channel_thumbnail_url} className="h-full w-full object-cover" alt="" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[11px] font-bold">
              {(channel.relationship === 'own' ? 'Y' : (channel.channel_name || 'C').charAt(0)).toUpperCase()}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

function pageItems(total: number, page: number) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const items: (number | '…')[] = [];
  if (pages <= 7) {
    for (let i = 1; i <= pages; i += 1) items.push(i);
    return items;
  }
  items.push(1);
  if (page > 3) items.push('…');
  const start = Math.max(2, page - 1);
  const end = Math.min(pages - 1, page + 1);
  for (let i = start; i <= end; i += 1) items.push(i);
  if (page < pages - 2) items.push('…');
  items.push(pages);
  return items;
}

function AnalysisWorkspace() {
  const projectId = useProjectId();
  const base = useYoutubePageBase();
  const router = useRouter();
  const search = useSearchParams();
  const analysisId = search?.get('id') || '';
  const access = useYoutubeAccess();
  const manage = allow(access, 'youtube_research.channels.manage');
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [current, setCurrent] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);
  const [q, setQ] = useState('');
  const [range, setRange] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState('');

  const listHref = `${base}/channel-compare`;

  const loadList = async () => {
    const listed = await yt(`projects/${projectId}/ai-analyses`);
    setRows(asList(listed));
  };

  useEffect(() => {
    if (!projectId) return;
    setReady(false);
    setError('');
    (async () => {
      try {
        if (analysisId) {
          setCurrent(await yt(`projects/${projectId}/ai-analyses/${analysisId}`));
        } else {
          setCurrent(null);
          await loadList();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load analysis');
        setCurrent(null);
      } finally {
        setReady(true);
      }
    })();
  }, [projectId, analysisId]);

  useEffect(() => {
    if (!projectId || !analysisId || current?.status !== 'generating') return;
    const timer = window.setInterval(() => {
      yt(`projects/${projectId}/ai-analyses/${analysisId}`)
        .then((row) => setCurrent(row))
        .catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [projectId, analysisId, current?.status]);

  const headerActions = useMemo(() => (
    analysisId ? null : (
      <>
        {manage ? (
          <Link className={partnerBtnSecondary} href={`${base}/channels?from=analysis`}>
            <Icon name="UserGroupIcon" size={16} /> Channel management
          </Link>
        ) : null}
        <Link className={partnerBtnPrimary} href={`${base}/videos`}>
          <Icon name="SparklesIcon" size={16} /> Analyse videos
        </Link>
      </>
    )
  ), [analysisId, base, manage]);
  useYoutubeRailActions(headerActions);

  const channelOptions = useMemo(() => {
    const names = new Set<string>();
    rows.forEach((row) => {
      (Array.isArray(row.videos) ? row.videos : []).forEach((video: Record<string, any>) => {
        const label = video.relationship === 'own' ? 'You' : video.channel_name;
        if (label) names.add(String(label));
      });
    });
    return [...names];
  }, [rows]);

  const filtered = useMemo(() => {
    const preset = DATE_PRESETS.find((item) => item.id === range);
    const since = preset?.days ? Date.now() - preset.days * 86400000 : 0;
    const needle = q.trim().toLowerCase();
    const next = rows.filter((row) => {
      const created = new Date(row.created_at).getTime();
      if (since && Number.isFinite(created) && created < since) return false;
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      const videos: Record<string, any>[] = Array.isArray(row.videos) ? row.videos : [];
      if (channelFilter !== 'all') {
        const labels = videos.map((video) => (video.relationship === 'own' ? 'You' : video.channel_name));
        if (!labels.includes(channelFilter)) return false;
      }
      if (!needle) return true;
      const hay = `${cleanTitle(row.name)} ${videos.map((video) => `${video.title} ${video.channel_name}`).join(' ')}`.toLowerCase();
      return hay.includes(needle);
    });
    next.sort((a, b) => {
      const left = new Date(a.created_at).getTime();
      const right = new Date(b.created_at).getTime();
      return sort === 'oldest' ? left - right : right - left;
    });
    return next;
  }, [rows, q, range, statusFilter, channelFilter, sort]);

  useEffect(() => {
    setPage(1);
  }, [q, range, statusFilter, channelFilter, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => {
    const completed = rows.filter((row) => row.status === 'ready').length;
    const videos = rows.reduce((sum, row) => sum + Number(row.video_count || (Array.isArray(row.videos) ? row.videos.length : 0)), 0);
    const channels = new Set<string>();
    rows.forEach((row) => uniqueChannels(Array.isArray(row.videos) ? row.videos : []).forEach((channel) => channels.add(String(channel.channel_id || channel.channel_name))));
    return { total: rows.length, completed, videos, channels: channels.size };
  }, [rows]);

  const removeAnalysis = async (id: string, title: string) => {
    if (!window.confirm(`Delete “${title}”? This cannot be undone.`)) return;
    setBusy('delete');
    setError('');
    try {
      await yt(`projects/${projectId}/ai-analyses/${id}`, { method: 'DELETE' });
      setMessage('Analysis removed.');
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete analysis');
    } finally {
      setBusy('');
    }
  };

  const generateReport = async (row: Record<string, any>) => {
    if (row.status !== 'ready') return;
    setBusy('report');
    setError('');
    setMessage('');
    try {
      await saveAndDownloadAnalysisReport(projectId, row);
      setMessage('Report downloaded and saved to Reports.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate the report');
    } finally {
      setBusy('');
    }
  };

  if (!ready && !error) return <PageLoader label={analysisId ? 'Loading analysis result…' : 'Loading analyses…'} />;

  if (analysisId) {
    return (
      <div className="space-y-4">
        {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
        {current?.status === 'ready' ? (
          <AnalysisComplete analysis={current} />
        ) : current?.status === 'generating' ? (
          <FetchVideosOverlay mode="analysis" />
        ) : current ? (
          <p className="text-sm text-slate-500">This analysis is {current.status}. {current.error_summary || 'Open the list and try another run from Research.'}</p>
        ) : !error ? (
          <PageLoader label="Loading analysis result…" />
        ) : null}
      </div>
    );
  }

  const filterClass = 'h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700';

  return (
    <div className="space-y-4">
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}
      {busy === 'report' ? <FetchVideosOverlay mode="report" /> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total analyses', value: stats.total, hint: 'Comparisons in this project', icon: 'DocumentTextIcon', tone: 'bg-violet-50 text-violet-600' },
          { label: 'Completed', value: stats.completed, hint: stats.total ? `${Math.round((stats.completed / stats.total) * 100)}%` : '0%', icon: 'CheckCircleIcon', tone: 'bg-emerald-50 text-emerald-600' },
          { label: 'Compared videos', value: stats.videos, hint: 'Across all analyses', icon: 'PlayCircleIcon', tone: 'bg-rose-50 text-rose-600' },
          { label: 'Channels covered', value: stats.channels, hint: 'Own and competitor', icon: 'UserGroupIcon', tone: 'bg-sky-50 text-sky-600' },
        ].map((card) => (
          <article key={card.label} className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${card.tone}`}>
              <Icon name={card.icon} size={18} />
            </span>
            <p className="mt-3 font-bricolage text-2xl font-bold text-slate-900">{card.value}</p>
            <p className="text-sm font-medium text-slate-700">{card.label}</p>
            <p className="text-xs text-slate-400">{card.hint}</p>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Icon name="MagnifyingGlassIcon" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className={`${partnerInput} h-10 pl-9`}
            placeholder="Enter analysis title or channel"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
        </div>
        <select className={filterClass} value={range} onChange={(event) => setRange(event.target.value)}>
          {DATE_PRESETS.map((item) => <option key={item.id} value={item.id}>{item.id === 'all' ? 'All time' : item.label}</option>)}
        </select>
        <select className={filterClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="ready">Completed</option>
          <option value="generating">Processing</option>
          <option value="failed">Failed</option>
        </select>
        <select className={filterClass} value={channelFilter} onChange={(event) => setChannelFilter(event.target.value)}>
          <option value="all">All channels</option>
          {channelOptions.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <select className={filterClass} value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3">Analysis title</th>
                <th className="px-3 py-3">Selected videos</th>
                <th className="px-3 py-3">Channels compared</th>
                <th className="px-3 py-3">Analysis type</th>
                <th className="px-3 py-3">Created on</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const videos: Record<string, any>[] = Array.isArray(row.videos) ? row.videos : [];
                const status = analysisStatusMeta(row.status);
                const kind = analysisKind(row);
                const title = cleanTitle(row.name);
                return (
                  <tr key={row.id} className="border-t border-slate-50 hover:bg-slate-50/80">
                    <td className="px-5 py-4">
                      <button type="button" className="text-left font-semibold text-slate-900 hover:text-secondary" onClick={() => router.push(`${listHref}?id=${row.id}`)}>
                        {title}
                      </button>
                    </td>
                    <td className="px-3 py-4"><VideoStack videos={videos} /></td>
                    <td className="px-3 py-4"><ChannelStack videos={videos} /></td>
                    <td className="px-3 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${kind.className}`}>
                        <Icon name={kind.icon} size={12} /> {kind.label}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-slate-500">{formatCreated(row.created_at)}</td>
                    <td className="px-3 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                        ● {status.label}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex justify-end gap-1">
                        <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-secondary" title="Open" onClick={() => router.push(`${listHref}?id=${row.id}`)}>
                          <Icon name="EyeIcon" size={18} />
                        </button>
                        <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-secondary" title="Download report" disabled={busy === 'report' || row.status !== 'ready'} onClick={() => generateReport(row)}>
                          <Icon name="ArrowDownTrayIcon" size={18} />
                        </button>
                        <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Delete" disabled={busy === 'delete'} onClick={() => removeAnalysis(String(row.id), title)}>
                          <Icon name="TrashIcon" size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!filtered.length ? (
          <div className="px-4 py-12 text-center">
            <p className="font-semibold text-slate-800">No comparisons yet</p>
            <p className="mt-1 text-sm text-slate-500">Select two or more videos on Research, then compare them. Each run appears here.</p>
            <Link href={`${base}/videos`} className={`${partnerBtnPrimary} mt-4`}>Go to Research</Link>
          </div>
        ) : null}
      </section>

      {filtered.length ? (
        <div className="flex items-center justify-end">
          <nav className="flex items-center gap-1">
            <button type="button" className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-50 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} aria-label="Previous page">‹</button>
            {pageItems(filtered.length, page).map((item, index) => (
              item === '…' ? (
                <span key={`e-${index}`} className="px-2 text-slate-400">…</span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPage(item)}
                  className={`min-w-8 rounded-lg px-2 py-1 text-sm font-semibold ${page === item ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {item}
                </button>
              )
            ))}
            <button type="button" className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-50 disabled:opacity-40" disabled={page >= pages} onClick={() => setPage((value) => value + 1)} aria-label="Next page">›</button>
          </nav>
        </div>
      ) : null}
    </div>
  );
}

export default function ChannelComparePage() {
  return (
    <ProjectRequired>
      <Suspense fallback={<PageLoader label="Loading analysis…" />}>
        <AnalysisWorkspace />
      </Suspense>
    </ProjectRequired>
  );
}
