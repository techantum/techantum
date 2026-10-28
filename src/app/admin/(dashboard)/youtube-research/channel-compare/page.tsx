'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AnalysisComplete from '@/components/admin/youtube/AnalysisComplete';
import PageLoader from '@/components/admin/youtube/PageLoader';
import { DATE_PRESETS, saveAndDownloadAnalysisReport } from '@/components/admin/youtube/research-ui';
import { allow, ProjectRequired, useProjectId, useYoutubeAccess, useYoutubePageBase, useYoutubeRailActions, yt } from '@/components/admin/youtube/YoutubeFrame';
import { partnerBtnPrimary, partnerBtnSecondary, partnerInput } from '@/components/partner/PartnerUi';
import Icon from '@/components/ui/AppIcon';
import { analysisStatusMeta, uniqueChannelCount } from '@/lib/youtube/analysis-display';

const PAGE_SIZE = 7;

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

function channelLabel(videos: Record<string, any>[]) {
  const names = [...new Set(videos.map((video) => (video.relationship === 'own' ? 'You' : video.channel_name || 'Channel')).filter(Boolean))];
  return { primary: names[0] || '—', count: Math.max(names.length, uniqueChannelCount(videos)) };
}

function VideoStack({ videos }: { videos: Record<string, any>[] }) {
  const shown = videos.slice(0, 3);
  const extra = videos.length - shown.length;
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center">
        {shown.map((video, index) => (
          video.thumbnail_url ? (
            <img
              key={`${video.id}-${index}`}
              src={video.thumbnail_url}
              alt=""
              className={`h-10 w-10 rounded-full border-2 border-white object-cover ${index ? '-ml-2.5' : ''}`}
            />
          ) : (
            <span key={`${video.id}-${index}`} className={`inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-semibold text-slate-500 ${index ? '-ml-2.5' : ''}`}>
              {(video.title || 'V').slice(0, 1).toUpperCase()}
            </span>
          )
        ))}
        {extra > 0 ? (
          <span className="-ml-2.5 inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-violet-50 text-xs font-semibold text-violet-700">
            +{extra}
          </span>
        ) : null}
      </div>
      <span className="text-sm text-slate-600">{videos.length} {videos.length === 1 ? 'video' : 'videos'}</span>
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
  const [selected, setSelected] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [range, setRange] = useState('all');
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

  const filtered = useMemo(() => {
    const preset = DATE_PRESETS.find((item) => item.id === range);
    const since = preset?.days ? Date.now() - preset.days * 86400000 : 0;
    const needle = q.trim().toLowerCase();
    return rows.filter((row) => {
      const created = new Date(row.created_at).getTime();
      if (since && Number.isFinite(created) && created < since) return false;
      if (!needle) return true;
      const videos: Record<string, any>[] = Array.isArray(row.videos) ? row.videos : [];
      const hay = `${row.name} ${videos.map((video) => `${video.title} ${video.channel_name}`).join(' ')}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, q, range]);

  useEffect(() => {
    setPage(1);
  }, [q, range]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allFilteredIds = filtered.map((row) => String(row.id));
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selected.includes(id));

  const toggleAll = () => {
    setSelected(allSelected ? selected.filter((id) => !allFilteredIds.includes(id)) : [...new Set([...selected, ...allFilteredIds])]);
  };

  const toggleOne = (id: string) => {
    setSelected((currentIds) => (currentIds.includes(id) ? currentIds.filter((item) => item !== id) : [...currentIds, id]));
  };

  const removeAnalyses = async (ids: string[]) => {
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} ${ids.length === 1 ? 'analysis' : 'analyses'}? This cannot be undone.`)) return;
    setBusy('delete');
    setError('');
    try {
      for (const id of ids) {
        await yt(`projects/${projectId}/ai-analyses/${id}`, { method: 'DELETE' });
      }
      setSelected((currentIds) => currentIds.filter((id) => !ids.includes(id)));
      setMessage(`${ids.length} ${ids.length === 1 ? 'analysis' : 'analyses'} removed.`);
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete analysis');
    } finally {
      setBusy('');
    }
  };

  const generateReports = async (ids: string[]) => {
    const readyRows = rows.filter((row) => ids.includes(String(row.id)) && row.status === 'ready');
    if (!readyRows.length) {
      setError('Select completed analyses to generate reports.');
      return;
    }
    setBusy('report');
    setError('');
    setMessage('');
    try {
      for (const row of readyRows) {
        await saveAndDownloadAnalysisReport(projectId, row);
      }
      setMessage(`${readyRows.length} ${readyRows.length === 1 ? 'report' : 'reports'} downloaded and saved to Reports.`);
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
        ) : current ? (
          <p className="text-sm text-slate-500">This analysis is {current.status}. {current.error_summary || 'Open the list and try another run from Research.'}</p>
        ) : !error ? (
          <PageLoader label="Loading analysis result…" />
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative space-y-4 pb-24">
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-bricolage text-xl font-semibold text-slate-900">Analysis</h2>
          <p className="text-sm text-slate-500">Each row is one comparison of the videos selected for that run.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Icon name="MagnifyingGlassIcon" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className={`${partnerInput} pl-9`}
              placeholder="Search analysis by title or channel…"
              value={q}
              onChange={(event) => setQ(event.target.value)}
            />
          </div>
          <select className={`${partnerInput} w-auto min-w-[150px]`} value={range} onChange={(event) => setRange(event.target.value)}>
            {DATE_PRESETS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="w-12 px-4 py-3">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" className="h-4 w-4 rounded border-slate-300 text-secondary" />
                </th>
                <th className="px-3 py-3">Analysis title</th>
                <th className="px-3 py-3">Videos</th>
                <th className="px-3 py-3">Channels</th>
                <th className="px-3 py-3">Created on</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const videos: Record<string, any>[] = Array.isArray(row.videos) ? row.videos : [];
                const channels = channelLabel(videos);
                const status = analysisStatusMeta(row.status);
                const checked = selected.includes(String(row.id));
                return (
                  <tr key={row.id} className={`border-t border-slate-50 ${checked ? 'bg-sky-50/40' : 'hover:bg-slate-50/80'}`}>
                    <td className="px-4 py-4">
                      <input type="checkbox" checked={checked} onChange={() => toggleOne(String(row.id))} aria-label={`Select ${row.name}`} className="h-4 w-4 rounded border-slate-300 text-secondary" />
                    </td>
                    <td className="px-3 py-4">
                      <p className="font-semibold text-slate-900">{row.name || 'Video comparison'}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{row.video_count || videos.length} videos compared</p>
                    </td>
                    <td className="px-3 py-4"><VideoStack videos={videos} /></td>
                    <td className="px-3 py-4">
                      <p className="font-medium text-slate-800">{channels.primary}</p>
                      <p className="text-xs text-slate-400">{channels.count} {channels.count === 1 ? 'channel' : 'channels'}</p>
                    </td>
                    <td className="px-3 py-4 text-slate-500">{formatCreated(row.created_at)}</td>
                    <td className="px-3 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                        {row.status === 'ready' ? '●' : row.status === 'failed' ? '●' : '●'} {status.label}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex justify-end gap-1">
                        <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-secondary" title="Open" onClick={() => router.push(`${listHref}?id=${row.id}`)}>
                          <Icon name="EyeIcon" size={18} />
                        </button>
                        <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-secondary" title="Download report" disabled={busy === 'report' || row.status !== 'ready'} onClick={() => generateReports([String(row.id)])}>
                          <Icon name="ArrowDownTrayIcon" size={18} />
                        </button>
                        <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Delete" disabled={busy === 'delete'} onClick={() => removeAnalyses([String(row.id)])}>
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
            <p className="mt-1 text-sm text-slate-500">Select videos on Research, then generate an analysis. The full set appears here as one comparison.</p>
            <Link href={`${base}/videos`} className={`${partnerBtnPrimary} mt-4`}>Go to Research</Link>
          </div>
        ) : null}
      </section>

      {filtered.length ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">{selected.length} {selected.length === 1 ? 'analysis' : 'analyses'} selected</p>
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
                  className={`min-w-8 rounded-lg px-2 py-1 text-sm font-semibold ${page === item ? 'bg-secondary text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {item}
                </button>
              )
            ))}
            <button type="button" className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-50 disabled:opacity-40" disabled={page >= pages} onClick={() => setPage((value) => value + 1)} aria-label="Next page">›</button>
          </nav>
        </div>
      ) : null}

      {selected.length ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur">
            <button type="button" className={partnerBtnSecondary} disabled={!!busy} onClick={() => generateReports(selected)}>
              <Icon name="ChartBarIcon" size={16} /> {busy === 'report' ? 'Generating…' : `Generate Report (${selected.length})`}
            </button>
            <button type="button" className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-100 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50" disabled={!!busy} onClick={() => removeAnalyses(selected)}>
              <Icon name="TrashIcon" size={16} /> Remove
            </button>
          </div>
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
