'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import AdminAlert from '@/components/admin/AdminAlert';
import FetchVideosOverlay from '@/components/admin/youtube/FetchVideosOverlay';
import PageLoader from '@/components/admin/youtube/PageLoader';
import { DATE_PRESETS, downloadResearchReport } from '@/components/admin/youtube/research-ui';
import { FilterMenu } from '@/components/admin/youtube/FilterMenu';
import { ProjectRequired, useProjectId, useProjectPlatform, useYoutubePageBase, yt } from '@/components/admin/youtube/YoutubeFrame';
import { platformCopy } from '@/lib/research/platforms';
import Icon from '@/components/ui/AppIcon';
import NavIcon from '@/components/ui/NavIcon';

const REPORT_TYPES = [
  { id: 'performance', label: 'Existing Performance Report' },
  { id: 'gap', label: 'Video Gap Analysis Report' },
  { id: 'high_performing', label: 'High-Performing Content Research Report' },
  { id: 'competitor', label: 'Own vs Competitor Research Report' },
  { id: 'improvement_plan', label: 'Content Improvement Plan' },
  { id: 'executive', label: 'Executive Research Report' },
];

function typeLabel(id: string) {
  return REPORT_TYPES.find((item) => item.id === id)?.label || id;
}

function cleanTitle(name?: string | null) {
  return String(name || 'Research report').replace(/\s*[·•\-–]\s*\d+\s*videos?\s*$/i, '').trim() || 'Research report';
}

function formatWhen(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) return String(value).slice(0, 16).replace('T', ' ');
  return {
    day: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
  };
}

function Reports() {
  const projectId = useProjectId();
  const copy = platformCopy(useProjectPlatform());
  const base = useYoutubePageBase();
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [range, setRange] = useState('all');
  const [sort, setSort] = useState('newest');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState('');
  const [menu, setMenu] = useState('');
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const listed = await yt(`projects/${projectId}/research-reports`);
    setRows(Array.isArray(listed) ? listed : listed?.rows || []);
  };

  useEffect(() => {
    if (!projectId) return;
    load().catch((err) => setError(err.message)).finally(() => setReady(true));
  }, [projectId]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu('');
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const stats = useMemo(() => {
    const active = rows.filter((row) => row.status !== 'archived');
    const readyCount = active.filter((row) => row.status === 'ready').length;
    const archived = rows.filter((row) => row.status === 'archived').length;
    const latest = active[0]?.generated_at || rows[0]?.generated_at;
    const when = latest ? formatWhen(latest) : null;
    return {
      total: active.length,
      ready: readyCount,
      archived,
      lastDay: when && typeof when === 'object' ? when.day : '—',
      lastTime: when && typeof when === 'object' ? when.time : '',
    };
  }, [rows]);

  const visible = useMemo(() => {
    const preset = DATE_PRESETS.find((item) => item.id === range);
    const since = preset?.days ? Date.now() - preset.days * 86400000 : 0;
    const needle = q.trim().toLowerCase();
    const next = rows.filter((row) => {
      if (statusFilter === 'all' && row.status === 'archived') return false;
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      const created = new Date(row.generated_at).getTime();
      if (since && Number.isFinite(created) && created < since) return false;
      const hay = `${row.name} ${row.report_type} ${row.analysis_name || ''}`.toLowerCase();
      return !needle || hay.includes(needle);
    });
    next.sort((a, b) => {
      const left = new Date(a.generated_at).getTime();
      const right = new Date(b.generated_at).getTime();
      return sort === 'oldest' ? left - right : right - left;
    });
    return next;
  }, [rows, q, statusFilter, range, sort]);

  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Delete “${name || 'this report'}”?`)) return;
    setPending(`delete:${id}`);
    setMenu('');
    try {
      setError('');
      await yt(`projects/${projectId}/research-reports/${id}`, { method: 'DELETE' });
      setMessage('Report deleted.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete report');
    } finally {
      setPending('');
    }
  };

  const archive = async (id: string) => {
    setPending(`archive:${id}`);
    setMenu('');
    try {
      await yt(`projects/${projectId}/research-reports/${id}/archive`, { method: 'POST', body: '{}' });
      setMessage('Report archived.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not archive report');
    } finally {
      setPending('');
    }
  };

  const download = async (id: string) => {
    setPending(`xlsx:${id}`);
    try {
      setError('');
      await downloadResearchReport(projectId, id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download the report');
    } finally {
      setPending('');
    }
  };

  if (!ready && !error) return <PageLoader label="Loading reports…" />;

  const menuRow = rows.find((row) => String(row.id) === menu);

  return (
    <div className="space-y-4">
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}
      {pending.startsWith('xlsx:') ? <FetchVideosOverlay mode="report" /> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-violet-50 text-violet-600">
            <Icon name="DocumentTextIcon" size={18} />
          </span>
          <p className="mt-3 font-bricolage text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="text-sm font-medium text-slate-700">Total reports</p>
          <p className="text-xs text-slate-400">Reports generated from analyses</p>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Icon name="CheckCircleIcon" size={18} />
          </span>
          <p className="mt-3 font-bricolage text-2xl font-bold text-slate-900">{stats.ready}</p>
          <p className="text-sm font-medium text-slate-700">Ready to download</p>
          <p className="text-xs text-slate-400">{stats.total ? `${Math.round((stats.ready / stats.total) * 100)}% of reports are ready` : 'No reports yet'}</p>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <Icon name="FolderIcon" size={18} />
          </span>
          <p className="mt-3 font-bricolage text-2xl font-bold text-slate-900">{stats.archived}</p>
          <p className="text-sm font-medium text-slate-700">Archived</p>
          <p className="text-xs text-slate-400">{stats.archived ? 'Hidden from the live list' : 'No archived reports'}</p>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-600">
            <Icon name="ClockIcon" size={18} />
          </span>
          <p className="mt-3 font-bricolage text-2xl font-bold text-slate-900">{stats.lastDay}</p>
          <p className="text-sm font-medium text-slate-700">Last generated</p>
          <p className="text-xs text-slate-400">{stats.lastTime || '—'}</p>
        </article>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Icon name="MagnifyingGlassIcon" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm" placeholder="Enter report name" value={q} onChange={(event) => setQ(event.target.value)} />
          </div>
          <FilterMenu
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            allLabel="All status"
            options={[
              { id: 'all', label: 'All status' },
              { id: 'ready', label: 'Ready' },
              { id: 'generating', label: 'Generating' },
              { id: 'failed', label: 'Failed' },
              { id: 'archived', label: 'Archived' },
            ]}
          />
          <FilterMenu
            label="Dates"
            value={range}
            onChange={setRange}
            allLabel="All dates"
            options={DATE_PRESETS.map((item) => ({ id: item.id, label: item.id === 'all' ? 'All dates' : item.label }))}
          />
          <FilterMenu
            label="Sort"
            value={sort}
            onChange={setSort}
            options={[
              { id: 'newest', label: 'Newest first' },
              { id: 'oldest', label: 'Oldest first' },
            ]}
          />
        </div>

        <ul className="divide-y divide-slate-50">
          {visible.map((row) => {
            const when = formatWhen(row.generated_at);
            const title = cleanTitle(row.name);
            const videos = Number(row.video_count || 0);
            const channels = Number(row.channel_count || 0);
            return (
              <li key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 hover:bg-slate-50/70">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
                  <Icon name="DocumentTextIcon" size={18} />
                </span>
                <div className="min-w-[14rem] flex-1">
                  <p className="font-semibold text-slate-900">{title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">Based on {row.analysis_name || typeLabel(row.report_type)}</p>
                </div>
                {channels ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Comparing {channels} {channels === 1 ? copy.entity : copy.entityPlural}</span>
                ) : null}
                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                  <Icon name="PlayCircleIcon" size={14} /> {videos} {videos === 1 ? copy.content : copy.contentPlural}
                </span>
                <span className="min-w-[6.5rem] text-right text-xs text-slate-500">
                  <span className="block">{typeof when === 'object' ? when.day : when}</span>
                  <span className="block text-slate-400">{typeof when === 'object' ? when.time : ''}</span>
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.status === 'ready' ? 'bg-emerald-50 text-emerald-700' : row.status === 'archived' ? 'bg-amber-50 text-amber-700' : row.status === 'failed' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                  {row.status === 'ready' ? 'Ready' : row.status}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-500">
                  <Icon name="DocumentArrowDownIcon" size={14} /> XLSX
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <Link href={`${base}/reports/${row.id}`} className="btn-ghost btn-sm">
                    <Icon name="EyeIcon" size={16} /> View
                  </Link>
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    disabled={pending === `xlsx:${row.id}` || row.status !== 'ready'}
                    onClick={() => download(row.id)}
                  >
                    <Icon name="ArrowDownTrayIcon" size={16} /> Download
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="More actions"
                    onClick={(event) => {
                      const rect = event.currentTarget.getBoundingClientRect();
                      setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
                      setMenu(menu === String(row.id) ? '' : String(row.id));
                    }}
                  >
                    <Icon name="EllipsisHorizontalIcon" size={18} />
                  </button>
                </div>
              </li>
            );
          })}
          {!visible.length ? (
            <li className="px-4 py-12 text-center text-sm text-slate-500">No reports yet. Generate one from selected videos on Research, or download a completed analysis.</li>
          ) : null}
        </ul>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/80 px-4 py-3 text-sm text-violet-800">
        <Icon name="LightBulbIcon" size={18} className="mt-0.5 shrink-0 text-violet-500" />
        <div>
          <p className="font-semibold">Reports are generated from completed analyses</p>
          <p className="mt-0.5 text-violet-700/80">Your analysis results can be saved as downloadable reports. View, download or archive them any time.</p>
        </div>
      </div>

      {menu && menuRow && typeof document !== 'undefined'
        ? createPortal(
          <div ref={menuRef} className="fixed z-[80] w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg" style={{ top: menuPos.top, right: menuPos.right }}>
            {menuRow.status !== 'archived' ? (
              <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50" disabled={pending === `archive:${menuRow.id}`} onClick={() => archive(menuRow.id)}>
                <NavIcon name="ArchiveBoxIcon" itemKey="archive" className="h-7 w-7 rounded-lg" size={14} /> Archive
              </button>
            ) : null}
            <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-rose-600 hover:bg-rose-50" disabled={pending === `delete:${menuRow.id}`} onClick={() => remove(menuRow.id, cleanTitle(menuRow.name))}>
              <NavIcon name="TrashIcon" itemKey="logout" delay={80} className="h-7 w-7 rounded-lg" size={14} /> Delete
            </button>
          </div>,
          document.body,
        )
        : null}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <ProjectRequired>
      <Reports />
    </ProjectRequired>
  );
}
