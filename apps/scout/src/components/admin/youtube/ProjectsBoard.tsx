'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import AdminAlert from '@/components/admin/AdminAlert';
import PageLoader from '@/components/admin/youtube/PageLoader';
import { ChannelStack, PROJECT_AVATARS, ProjectProgress, ProjectStatusBadge, formatAgo } from '@/components/admin/youtube/ProjectMarks';
import { allow, rememberProject, useYoutubeAccess, useYoutubePageBase, yt } from '@/components/admin/youtube/YoutubeFrame';
import { partnerBtnPrimary, partnerBtnSecondary, partnerInput } from '@/components/partner/PartnerUi';
import Icon from '@/components/ui/AppIcon';
import NavIcon from '@/components/ui/NavIcon';
import type { HomeProject } from '@/lib/youtube/home-display';
import { asProjectStatus } from '@/lib/youtube/project-status';

type Counts = { all: number; todo: number; active: number; completed: number };

export default function ProjectsBoard() {
  const router = useRouter();
  const base = useYoutubePageBase();
  const access = useYoutubeAccess();
  const manage = allow(access, 'youtube_research.channels.manage');
  const [rows, setRows] = useState<HomeProject[]>([]);
  const [counts, setCounts] = useState<Counts>({ all: 0, todo: 0, active: 0, completed: 0 });
  const [total, setTotal] = useState(0);
  const [bucket, setBucket] = useState('all');
  const [q, setQ] = useState('');
  const [layout, setLayout] = useState<'list' | 'grid'>('list');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState('');
  const [busy, setBusy] = useState('');
  const [rename, setRename] = useState<{ id: string; name: string } | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const load = async (nextBucket = bucket, nextQ = q) => {
    const params = new URLSearchParams({ bucket: nextBucket, q: nextQ, page: '1', pageSize: '50' });
    const body = await yt(`projects?${params}`);
    setRows(body.rows || []);
    setTotal(body.total || 0);
    if (body.counts) setCounts(body.counts);
  };

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      load(bucket, q)
        .catch((err) => { if (!cancelled) setError(err.message); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, loading ? 0 : 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, bucket]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu('');
    };
    const onScroll = () => setMenu('');
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, []);

  const go = (project: HomeProject) => {
    rememberProject(project.id);
    router.push(`${base}/videos`);
  };

  const run = async (id: string, work: () => Promise<void>) => {
    setBusy(id);
    setError('');
    try {
      await work();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy('');
      setMenu('');
    }
  };

  const tabs = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'todo', label: 'To Do', count: counts.todo },
    { id: 'active', label: 'In Progress', count: counts.active },
    { id: 'completed', label: 'Completed', count: counts.completed },
  ];

  if (loading) return <PageLoader label="Loading projects…" />;

  const openMenu = (projectId: string, event: ReactMouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    setMenu(menu === projectId ? '' : projectId);
  };

  const menuProject = rows.find((row) => row.id === menu);

  const actions = (project: HomeProject) => (
    <div className="flex items-center justify-end gap-2">
      <button type="button" className={`${partnerBtnSecondary} !px-3 !py-1.5 text-xs`} onClick={() => go(project)}>
        Open →
      </button>
      {manage ? (
        <button type="button" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={(event) => openMenu(project.id, event)} aria-label="Project actions">
          <Icon name="EllipsisHorizontalIcon" size={18} />
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="flex min-h-[calc(100dvh-8.5rem)] flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 font-bricolage text-3xl font-bold tracking-tight text-slate-900">Projects</h1>
        {manage ? <Link href={`${base}/projects/new`} className={partnerBtnPrimary}>+ New project</Link> : null}
      </div>

      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}

      <section className="flex min-h-0 flex-1 flex-col overflow-visible rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setBucket(tab.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${bucket === tab.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                {tab.label} {tab.count}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative min-w-[12rem] flex-1">
              <Icon name="MagnifyingGlassIcon" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className={`${partnerInput} pl-9`} placeholder="Enter project name" value={q} onChange={(event) => setQ(event.target.value)} />
            </div>
            <div className="flex rounded-xl border border-slate-200 p-0.5">
              <button type="button" className={`rounded-lg p-2 ${layout === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`} onClick={() => setLayout('list')} aria-label="List view">
                <Icon name="Bars3Icon" size={16} />
              </button>
              <button type="button" className={`rounded-lg p-2 ${layout === 'grid' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`} onClick={() => setLayout('grid')} aria-label="Grid view">
                <Icon name="Squares2X2Icon" size={16} />
              </button>
            </div>
          </div>
        </div>

        {layout === 'grid' ? (
          <div className="grid flex-1 content-start gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((project, index) => (
              <article key={project.id} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-2">
                  <button type="button" className="flex min-w-0 items-start gap-3 text-left" onClick={() => go(project)}>
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-bold ${PROJECT_AVATARS[index % PROJECT_AVATARS.length]}`}>{project.initials}</span>
                    <span>
                      <span className="block font-semibold text-slate-900">{project.name}</span>
                      <span className="block text-xs text-slate-400">{project.own_channel_name || project.brand_name || 'No channel connected'}</span>
                    </span>
                  </button>
                  {actions(project)}
                </div>
                <div className="mt-3"><ProjectStatusBadge status={project.status} /></div>
                <div className="mt-4"><ChannelStack project={project} index={index} /></div>
                <div className="mt-4"><ProjectProgress project={project} /></div>
                <p className="mt-3 text-xs text-slate-400">{Number(project.video_count).toLocaleString('en-IN')} videos · {formatAgo(project.updated_at)}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Channels</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Setup</th>
                  <th className="px-4 py-3 text-right">Videos</th>
                  <th className="px-4 py-3">Last updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((project, index) => (
                  <tr key={project.id} className="border-t border-slate-50 hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <button type="button" className="flex items-center gap-3 text-left" onClick={() => go(project)}>
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-bold ${PROJECT_AVATARS[index % PROJECT_AVATARS.length]}`}>{project.initials}</span>
                        <span>
                          <span className="flex items-center gap-2 font-semibold text-slate-900">
                            {project.name}
                          </span>
                          <span className="block text-xs text-slate-400">{project.own_channel_name || project.brand_name || 'No channel connected'}</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3"><ChannelStack project={project} index={index} /></td>
                    <td className="px-4 py-3"><ProjectStatusBadge status={project.status} /></td>
                    <td className="px-4 py-3"><ProjectProgress project={project} /></td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">{Number(project.video_count).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-slate-500">{formatAgo(project.updated_at)}</td>
                    <td className="px-4 py-3">{actions(project)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!rows.length ? <p className="flex-1 px-4 py-12 text-center text-sm text-slate-500">No projects in this view. Create one to benchmark a channel against competitors.</p> : null}
        <div className="mt-auto border-t border-slate-100 px-4 py-3 text-xs text-slate-400">{total} shown from the database</div>
      </section>

      {menu && menuProject && typeof document !== 'undefined'
        ? createPortal(
          <div
            ref={menuRef}
            className="fixed z-[80] w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg"
            style={{ top: menuPos.top, right: menuPos.right }}
          >
            <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50" onClick={() => go(menuProject)}>
              <NavIcon name="FolderOpenIcon" itemKey="open" className="h-7 w-7 rounded-lg" size={14} /> Open
            </button>
            <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50" onClick={() => { setRename({ id: menuProject.id, name: menuProject.name }); setMenu(''); }}>
              <NavIcon name="PencilSquareIcon" itemKey="rename" delay={80} className="h-7 w-7 rounded-lg" size={14} /> Rename
            </button>
            <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-50" disabled={busy === menuProject.id} onClick={() => run(menuProject.id, async () => { await yt(`projects/${menuProject.id}/duplicate`, { method: 'POST', body: '{}' }); })}>
              <NavIcon name="DocumentDuplicateIcon" itemKey="duplicate" delay={160} className="h-7 w-7 rounded-lg" size={14} /> Duplicate
            </button>
            {asProjectStatus(menuProject.status) === 'completed' ? (
              <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50" onClick={() => run(menuProject.id, async () => { await yt(`projects/${menuProject.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'active' }) }); })}>
                <NavIcon name="ArrowPathIcon" itemKey="restore" delay={240} className="h-7 w-7 rounded-lg" size={14} /> Mark In Progress
              </button>
            ) : !menuProject.legacy ? (
              <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50" onClick={() => run(menuProject.id, async () => { await yt(`projects/${menuProject.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'completed' }) }); })}>
                <NavIcon name="CheckCircleIcon" itemKey="complete" delay={240} className="h-7 w-7 rounded-lg" size={14} /> Mark Completed
              </button>
            ) : null}
          </div>,
          document.body,
        )
        : null}

      {rename ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
          <form
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onSubmit={(event) => {
              event.preventDefault();
              const name = rename.name.trim();
              if (name.length < 2) return;
              run(rename.id, async () => { await yt(`projects/${rename.id}`, { method: 'PATCH', body: JSON.stringify({ name }) }); }).finally(() => setRename(null));
            }}
          >
            <h2 className="font-bricolage text-lg font-semibold text-slate-900">Rename project</h2>
            <input className={`${partnerInput} mt-3`} value={rename.name} onChange={(event) => setRename({ ...rename, name: event.target.value })} autoFocus />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className={partnerBtnSecondary} onClick={() => setRename(null)}>Cancel</button>
              <button type="submit" className={partnerBtnPrimary} disabled={busy === rename.id}>Save</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
