'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
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
    <div className="space-y-6 max-w-6xl">
      <AdminPageHeader
        title="Projects"
        description="Create client requirement projects. Draft links stay hidden until you set status to Active."
        action={<Link href="/admin/projects/create" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold">Create Project</Link>}
      />
      {message && <p className="text-sm bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-lg">{message}</p>}
      <AdminSection title="All Projects" description={`${projects.length} project(s)`}>
        <div className="flex flex-wrap gap-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search project, company, email..." className="w-72 max-w-full rounded-lg border border-border px-3 py-2 text-sm" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-border px-3 py-2 text-sm">
            <option value="all">All statuses</option>
            {Object.entries(PROJECT_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
        {loading ? <p className="text-sm text-muted-foreground">Loading projects...</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Project</th>
                  <th className="pb-3 pr-4 font-medium">Client</th>
                  <th className="pb-3 pr-4 font-medium">Type</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="border-b border-border/60 align-top">
                    <td className="py-3 pr-4">
                      <p className="font-medium">{project.project_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{project.project_code}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <p>{project.company_name}</p>
                      <p className="text-xs text-muted-foreground">{project.email}</p>
                    </td>
                    <td className="py-3 pr-4 text-xs">
                      {project.project_type}<br />
                      <span className="text-muted-foreground">{project.package_name || 'No package'}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <select
                        value={project.status}
                        onChange={(e) => updateStatus(project.id, e.target.value)}
                        className={`rounded-lg border border-border px-2 py-1 text-xs font-medium ${STATUS_COLORS[project.status]}`}
                      >
                        {Object.entries(PROJECT_STATUS_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        {project.status === 'active' ? (
                          <>
                            <button onClick={() => copy(project.share_url)} className="text-xs text-indigo-600 hover:underline">Copy Link</button>
                            <button onClick={() => regenerate(project.id)} className="text-xs text-amber-700 hover:underline">Regenerate</button>
                            <a href={`mailto:${project.email}?subject=Requirement collection for ${encodeURIComponent(project.project_name)}&body=${encodeURIComponent(project.share_url || '')}`} className="text-xs text-primary hover:underline">Email</a>
                            <a href={`https://wa.me/?text=${encodeURIComponent(project.share_url || '')}`} target="_blank" rel="noreferrer" className="text-xs text-green-700 hover:underline">WhatsApp</a>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {project.status === 'draft' ? 'Activate to share link' : 'Link disabled'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {projects.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No projects yet.</p>}
          </div>
        )}
      </AdminSection>
    </div>
  );
}
