'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminBadge from '@/components/admin/AdminBadge';
import AdminButton from '@/components/admin/AdminButton';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { allow, rememberProject, useYoutubeAccess, useYoutubePageBase, yt } from '@/components/admin/youtube/YoutubeFrame';

const control = 'h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm';

export default function ResearchProjectsPage() {
  const router = useRouter();
  const base = useYoutubePageBase();
  const access = useYoutubeAccess();
  const manage = allow(access, 'youtube_research.channels.manage');
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [error, setError] = useState('');

  const load = async (nextPage = page) => {
    const params = new URLSearchParams({ q, status, page: String(nextPage), pageSize: '20' });
    const body = await yt(`projects?${params}`);
    setRows(body.rows || []);
    setTotal(body.total || 0);
  };

  useEffect(() => {
    load(1).catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openProject = (id: string) => {
    rememberProject(id);
    router.push(`${base}/overview`);
  };

  const pages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-4">
      <AdminPageHeader
        kicker="YouTube Research"
        title="Research Projects"
        description="Manage your YouTube research projects, competitor channels, and content analysis."
        action={manage ? <Link href={`${base}/projects/new`} className="inline-flex rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-white">+ New Project</Link> : null}
      />
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      <form className="flex flex-col gap-2 xl:flex-row" onSubmit={(event) => { event.preventDefault(); setPage(1); load(1).catch((err) => setError(err.message)); }}>
        <input className={`${control} xl:flex-1`} placeholder="Search projects" value={q} onChange={(event) => setQ(event.target.value)} />
        <select className={control} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        <AdminButton type="submit" variant="primary">Search</AdminButton>
      </form>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {['Project', 'Primary channel', 'Competitors', 'Imported videos', 'Updated', 'Status', 'Actions'].map((heading) => <th key={heading} className="px-3 py-3">{heading}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-3 py-3">
                    <span className="block font-semibold text-slate-900">{row.name}</span>
                    <span className="block text-xs text-slate-400">{row.brand_name || row.industry || '—'}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-2">
                      {row.own_thumbnail_url ? <img src={row.own_thumbnail_url} alt="" className="h-8 w-8 rounded-full object-cover" /> : null}
                      <span className="min-w-0">
                        <span className="block truncate">{row.own_channel_name || (row.own_youtube_channel_id ? 'Refresh required' : 'Not added')}</span>
                        {row.own_channel_handle ? <span className="block truncate text-xs text-slate-400">@{String(row.own_channel_handle).replace(/^@/, '')}</span> : null}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-3">{row.competitor_count}</td>
                  <td className="px-3 py-3">{row.video_count}</td>
                  <td className="px-3 py-3 text-slate-500">{String(row.updated_at || '').slice(0, 10)}</td>
                  <td className="px-3 py-3"><AdminBadge variant={row.status === 'active' ? 'green' : 'default'}>{row.status}</AdminBadge></td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                      <button type="button" className="text-sky-700" onClick={() => openProject(row.id)}>Open</button>
                      {manage ? <Link className="text-slate-600" href={`${base}/projects/${row.id}/edit`}>Edit</Link> : null}
                      {manage && row.status === 'active' && !row.legacy ? <button type="button" className="text-rose-600" onClick={() => { if (window.confirm(`Archive ${row.name}? Its channels and notes stay saved.`)) yt(`projects/${row.id}`, { method: 'DELETE' }).then(() => load()).catch((err) => setError(err.message)); }}>Archive</button> : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length ? <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">No projects yet. Create one to start competitor research.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>{total} projects</span>
          <span className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => { const next = page - 1; setPage(next); load(next); }}>Previous</button>
            <span>{page} / {pages}</span>
            <button type="button" disabled={page >= pages} onClick={() => { const next = page + 1; setPage(next); load(next); }}>Next</button>
          </span>
        </div>
      </section>
    </div>
  );
}
