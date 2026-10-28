'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import PageLoader from '@/components/admin/youtube/PageLoader';
import { ChannelStack, StatusPill, ThumbStack, Trend, formatStamp } from '@/components/admin/youtube/QuickMarks';
import { rememberProject, useYoutubePageBase, yt, youtubeApiPrefix, youtubePortalHeader } from '@/components/admin/youtube/YoutubeFrame';
import Icon from '@/components/ui/AppIcon';
import VideoThumb from '@/components/admin/youtube/VideoThumb';

type Kind = 'analysis' | 'report';

function cover(videos: { thumbnail_url?: string; youtube_video_id?: string; title?: string }[]) {
  return videos?.[0];
}

export default function QuickHistory({ kind }: { kind: Kind }) {
  const router = useRouter();
  const base = useYoutubePageBase();
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [stats, setStats] = useState<Record<string, any>>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('newest');

  const load = async () => {
    const body = await yt(kind === 'analysis' ? 'quick/analyses' : 'quick/reports');
    setRows(body.rows || []);
    setStats(body.stats || {});
  };

  useEffect(() => {
    load().catch((err) => setError(err.message)).finally(() => setReady(true));
  }, [kind]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows.filter((row) => {
      if (q && !String(row.name || '').toLowerCase().includes(q)) return false;
      if (kind === 'analysis' && status !== 'all') {
        if (status === 'completed' && row.status !== 'ready') return false;
        if (status === 'processing' && row.status !== 'generating') return false;
        if (status === 'failed' && row.status !== 'failed') return false;
      }
      return true;
    });
    if (sort === 'oldest') list = [...list].reverse();
    return list;
  }, [rows, search, status, sort, kind]);

  const open = (row: Record<string, any>) => {
    rememberProject(row.project_id);
    if (kind === 'analysis') router.push(`${base}/channel-compare?id=${row.id}`);
    else router.push(`${base}/reports/${row.id}`);
  };

  const remove = async (row: Record<string, any>) => {
    if (!window.confirm(kind === 'analysis' ? 'Delete this analysis?' : 'Delete this report?')) return;
    await yt(`projects/${row.project_id}/${kind === 'analysis' ? 'ai-analyses' : 'research-reports'}/${row.id}`, { method: 'DELETE' });
    await load();
  };

  const download = async (row: Record<string, any>) => {
    rememberProject(row.project_id);
    let reportId = row.id;
    if (kind === 'analysis') {
      const report = await yt(`projects/${row.project_id}/research-reports`, {
        method: 'POST',
        body: JSON.stringify({ analysis_id: row.id, name: row.name, report_type: 'executive', workspace: 'quick_report' }),
      });
      reportId = report.id;
    }
    const response = await fetch(`${youtubeApiPrefix()}/projects/${row.project_id}/research-reports/${reportId}/export`, { headers: youtubePortalHeader() });
    if (!response.ok) throw new Error('Could not download');
    const blob = await response.blob();
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `${row.name || 'report'}.pdf`;
    link.click();
    URL.revokeObjectURL(href);
  };

  if (!ready) return <PageLoader label={kind === 'analysis' ? 'Loading analyses…' : 'Loading reports…'} />;

  const cards = kind === 'analysis'
    ? [
        { label: 'Total Analyses', value: stats.total || 0, trend: stats.totalTrend, icon: 'DocumentTextIcon', tone: 'bg-violet-50 text-violet-600' },
        { label: 'Completed', value: stats.completed || 0, trend: stats.completedTrend, icon: 'CheckCircleIcon', tone: 'bg-emerald-50 text-emerald-600' },
        { label: 'Videos Compared', value: stats.videos || 0, trend: stats.totalTrend, icon: 'PlayCircleIcon', tone: 'bg-sky-50 text-sky-600' },
        { label: 'Last Generated', value: stats.lastGenerated ? formatStamp(stats.lastGenerated) : '—', icon: 'CalendarDaysIcon', tone: 'bg-amber-50 text-amber-600', stamp: true },
      ]
    : [
        { label: 'Total Reports', value: stats.total || 0, trend: stats.totalTrend, icon: 'DocumentTextIcon', tone: 'bg-violet-50 text-violet-600' },
        { label: 'Ready to Download', value: stats.ready || 0, trend: stats.readyTrend, icon: 'CheckCircleIcon', tone: 'bg-emerald-50 text-emerald-600' },
        { label: 'Videos Covered', value: stats.videos || 0, trend: stats.totalTrend, icon: 'PlayCircleIcon', tone: 'bg-sky-50 text-sky-600' },
        { label: 'Last Generated', value: stats.lastGenerated ? formatStamp(stats.lastGenerated) : '—', icon: 'CalendarDaysIcon', tone: 'bg-amber-50 text-amber-600', stamp: true },
      ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-bricolage text-3xl font-bold text-slate-900">{kind === 'analysis' ? 'Quick Analysis' : 'Quick Reports'}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {kind === 'analysis'
              ? 'Quickly analyze selected YouTube videos without creating a full project.'
              : 'Generate and download quick comparison reports from selected YouTube videos.'}
          </p>
        </div>
        <Link href={kind === 'analysis' ? `${base}/quick-analysis/new` : `${base}/quick-reports/new`} className="inline-flex h-11 items-center gap-2 rounded-full bg-violet-700 px-4 text-sm font-semibold text-white shadow-sm">
          <Icon name="PlusIcon" size={16} /> Add Videos
        </Link>
      </div>
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${card.tone}`}>
                <Icon name={card.icon} size={20} />
              </span>
              {'trend' in card && typeof card.trend === 'number' ? <Trend value={card.trend} /> : null}
            </div>
            <p className="mt-4 text-sm text-slate-500">{card.label}</p>
            <p className={`font-bricolage font-bold text-slate-900 ${card.stamp ? 'text-lg' : 'text-3xl'}`}>{card.value}</p>
          </article>
        ))}
      </div>

      <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <label className="relative min-w-[220px] flex-1">
            <Icon name="MagnifyingGlassIcon" size={16} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm" placeholder={kind === 'analysis' ? 'Search analyses...' : 'Search reports...'} />
          </label>
          {kind === 'analysis' ? (
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm">
              <option value="all">All status</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
          ) : null}
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-3">{kind === 'analysis' ? 'Analysis' : 'Report'}</th>
                <th className="px-3 py-3">Selected Videos</th>
                <th className="px-3 py-3">Channels Compared</th>
                <th className="px-3 py-3">Created</th>
                <th className="px-3 py-3">{kind === 'analysis' ? 'Status' : 'Format'}</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const videos = Array.isArray(row.videos) ? row.videos : [];
                const first = cover(videos);
                return (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-3 py-3">
                      <button type="button" className="flex items-center gap-3 text-left" onClick={() => open(row)}>
                        <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                          <VideoThumb youtubeId={first?.youtube_video_id} src={first?.thumbnail_url} className="h-full w-full object-cover" alt="" />
                        </span>
                        <span>
                          <span className="block font-semibold text-slate-900">{row.name}</span>
                          <span className="block text-xs text-slate-400">{videos.length} video{videos.length === 1 ? '' : 's'}</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-3"><ThumbStack videos={videos} /></td>
                    <td className="px-3 py-3"><ChannelStack videos={videos} /></td>
                    <td className="px-3 py-3 text-slate-500">{formatStamp(row.created_at || row.generated_at)}</td>
                    <td className="px-3 py-3">
                      {kind === 'analysis' ? <StatusPill status={row.status} /> : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600">
                          <Icon name="DocumentIcon" size={12} /> PDF
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className="flex gap-1 text-slate-400">
                        <button type="button" aria-label="View" className="rounded-lg p-2 hover:bg-slate-50 hover:text-slate-700" onClick={() => open(row)}><Icon name="EyeIcon" size={16} /></button>
                        <button type="button" aria-label="Download" className="rounded-lg p-2 hover:bg-slate-50 hover:text-slate-700" onClick={() => void download(kind === 'analysis' ? row : row).catch((err) => setError(err.message))}><Icon name="ArrowDownTrayIcon" size={16} /></button>
                        {kind === 'report' ? (
                          <button type="button" aria-label="Copy link" className="rounded-lg p-2 hover:bg-slate-50 hover:text-slate-700" onClick={() => navigator.clipboard.writeText(`${window.location.origin}${base}/reports/${row.id}`)}><Icon name="LinkIcon" size={16} /></button>
                        ) : null}
                        <button type="button" aria-label="Delete" className="rounded-lg p-2 hover:bg-rose-50 hover:text-rose-600" onClick={() => void remove(row)}><Icon name="TrashIcon" size={16} /></button>
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length ? (
                <tr>
                  <td colSpan={6} className="px-3 py-16 text-center text-sm text-slate-500">
                    Nothing here yet. Add videos to create your first {kind === 'analysis' ? 'analysis' : 'report'}.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
