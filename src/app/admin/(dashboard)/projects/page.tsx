'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminButton from '@/components/admin/AdminButton';
import { EmptyRecords, FilterBar, FilterSearch, FilterSelect } from '@/components/admin/ListFilters';
import { FinanceTd, FinanceTh } from '@/components/admin/finance/FinanceUi';
import { PROJECT_STATUS_LABELS, type ClientProject } from '@/lib/client-requirements/types';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  active: 'bg-green-100 text-green-800',
  closed: 'bg-zinc-100 text-zinc-600',
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status !== 'all') params.set('status', status);
    fetch(`/api/admin/projects?${params}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          setMessage(body.error || 'Failed to load projects.');
          return null;
        }
        return r.json();
      })
      .then((data) => Array.isArray(data) && setProjects(data))
      .finally(() => setLoading(false));
  }, [search, status]);

  useEffect(() => { load(); }, [load]);

  const copy = async (url: string | null) => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setMessage('Public link copied.');
  };

  const regenerate = async (id: string) => {
    const res = await fetch(`/api/admin/projects/${id}/share`, { method: 'POST' });
    const body = await res.json();
    setMessage(res.ok ? 'New public link generated.' : body.error || 'Link generation failed');
    load();
  };

  const updateStatus = async (id: string, nextStatus: string) => {
    const res = await fetch(`/api/admin/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    const body = await res.json();
    if (!res.ok) {
      setMessage(body.error || 'Status update failed.');
      return;
    }
    setMessage(
      nextStatus === 'active'
        ? 'Project activated. The public link is now live for the client.'
        : nextStatus === 'draft'
          ? 'Project set to draft. The public link is hidden until you activate it.'
          : 'Project closed. The public link no longer accepts submissions.'
    );
    load();
  };

  return (
    <div className="w-full space-y-6">
      <AdminPageHeader
        title="Projects"
        description="Create client requirement projects. Draft links stay hidden until you set status to Active."
        action={<Link href="/admin/projects/create"><AdminButton variant="primary">+ Create Project</AdminButton></Link>}
      />
      {message && <p className="text-sm bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-lg">{message}</p>}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <FilterBar
        plain
        onSearch={load}
        onClear={() => {
          setSearch('');
          setStatus('all');
        }}
      >
        <FilterSearch value={search} onChange={setSearch} placeholder="Search project, company, email..." />
        <FilterSelect value={status} onChange={setStatus}>
          <option value="all">All statuses</option>
          {Object.entries(PROJECT_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </FilterSelect>
      </FilterBar>
        {loading ? <p className="px-5 py-8 text-sm text-slate-500">Loading projects...</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <FinanceTh>Project</FinanceTh>
                  <FinanceTh>Company</FinanceTh>
                  <FinanceTh>Type</FinanceTh>
                  <FinanceTh>Status</FinanceTh>
                  <FinanceTh>Actions</FinanceTh>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <FinanceTd>
                      <p className="font-semibold text-slate-900">{project.project_name}</p>
                      <p className="text-xs text-slate-400 font-mono">{project.project_code}</p>
                    </FinanceTd>
                    <FinanceTd>
                      <p>{project.company_name}</p>
                      <p className="text-xs text-slate-400">{project.email}</p>
                    </FinanceTd>
                    <FinanceTd>
                      {project.project_type}<br />
                      <span className="text-xs text-slate-400">{project.package_name || 'No package'}</span>
                    </FinanceTd>
                    <FinanceTd>
                      <select
                        value={project.status}
                        onChange={(e) => updateStatus(project.id, e.target.value)}
                        className={`rounded-lg border border-border px-2 py-1 text-xs font-medium ${STATUS_COLORS[project.status]}`}
                      >
                        {Object.entries(PROJECT_STATUS_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </FinanceTd>
                    <FinanceTd>
                      <div className="flex flex-wrap gap-2">
                        {project.status === 'active' ? (
                          <>
                            <button type="button" onClick={() => copy(project.share_url)} className="text-xs font-semibold text-secondary hover:underline">Copy Link</button>
                            <button type="button" onClick={() => regenerate(project.id)} className="text-xs font-semibold text-slate-500 hover:underline">Regenerate</button>
                            <a href={`mailto:${project.email}?subject=Requirement collection for ${encodeURIComponent(project.project_name)}&body=${encodeURIComponent(project.share_url || '')}`} className="text-xs font-semibold text-secondary hover:underline">Email</a>
                            <a href={`https://wa.me/?text=${encodeURIComponent(project.share_url || '')}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-emerald-600 hover:underline">WhatsApp</a>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {project.status === 'draft' ? 'Activate to share link' : 'Link disabled'}
                          </span>
                        )}
                      </div>
                    </FinanceTd>
                  </tr>
                ))}
              </tbody>
            </table>
            {projects.length === 0 && <EmptyRecords title="No projects found" description="Try another filter or create a project." action={<Link href="/admin/projects/create"><AdminButton variant="primary">+ Create Project</AdminButton></Link>} />}
          </div>
        )}
        <p className="px-5 pb-4 text-xs text-slate-400">{projects.length} record{projects.length === 1 ? '' : 's'}</p>
      </section>
    </div>
  );
}
