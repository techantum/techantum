'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminButton from '@/components/admin/AdminButton';
import { PmBadge, PmShell, Td, Th } from '@/components/admin/pm/ui';

export default function ProjectsPage() {
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [filters, setFilters] = useState({ q: '', category: '', rag: '', health: '', priority: '' });
  const [error, setError] = useState('');

  const load = () => {
    const params = new URLSearchParams(filters);
    fetch(`/api/admin/pm/projects?${params}`).then((r) => r.json()).then((body) => {
      setRows(body.rows || []);
      setError(body.error || '');
    });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFilters({
      q: params.get('q') || '',
      category: params.get('category') || '',
      rag: params.get('rag') || '',
      health: params.get('health') || '',
      priority: params.get('priority') || '',
    });
  }, []);

  useEffect(() => { load(); }, [filters.category, filters.rag, filters.health, filters.priority]);

  const archive = async (id: string) => {
    if (!confirm('Archive this project?')) return;
    const res = await fetch(`/api/admin/pm/projects/${id}/archive`, { method: 'POST' });
    const body = await res.json();
    if (!res.ok) setError(body.error || 'Could not archive');
    else load();
  };

  return (
    <PmShell>
      <AdminPageHeader title="Projects" description="Delivery register for every client project." action={<Link href="/admin/pm/projects/new"><AdminButton variant="primary">Add Project</AdminButton></Link>} />
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-5">
        <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Search code, project, client" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') load(); }} />
        <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}><option value="">All categories</option><option value="planned_to_onboard">Planned to Onboard</option><option value="onboarded">Onboarded</option><option value="ongoing">Ongoing</option><option value="delivered">Delivered</option><option value="on_hold">On Hold</option><option value="cancelled">Cancelled</option></select>
        <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={filters.rag} onChange={(e) => setFilters({ ...filters, rag: e.target.value })}><option value="">All RAG</option><option value="green">Green</option><option value="amber">Amber</option><option value="red">Red</option></select>
        <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={filters.health} onChange={(e) => setFilters({ ...filters, health: e.target.value })}><option value="">All health</option><option>On Track</option><option>Watch</option><option>At Risk</option><option>Overdue</option><option>Update Pending</option><option>In Support</option><option>Support Ending Soon</option><option>Support Ended</option></select>
        <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}><option value="">All priority</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select>
      </div>
      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
        <table className="min-w-full">
          <thead><tr><Th>Code</Th><Th>Client</Th><Th>Project</Th><Th>Type</Th><Th>Category</Th><Th>AM</Th><Th>Lead</Th><Th>Phase</Th><Th>Team</Th><Th>Tickets</Th><Th>Requirements</Th><Th>Effective End</Th><Th>Days</Th><Th>RAG</Th><Th>%</Th><Th>Last Update</Th><Th>Health</Th><Th>Actions</Th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <Td>{row.project_code}</Td><Td>{row.client_name}</Td><Td>{row.project_name}</Td><Td>{row.type_name}</Td>
                <Td><PmBadge value={row.category} /></Td><Td>{row.account_manager_name}</Td><Td>{row.lead_developer_name}</Td><Td>{row.phase_name}</Td>
                <Td>{row.team_size ?? 0}</Td><Td>{row.open_tickets ?? 0}</Td><Td>{row.pending_requirements ?? 0}</Td>
                <Td>{row.effective_end}</Td><Td>{row.days_to_deadline ?? '—'}</Td><Td><PmBadge value={row.latest_rag} /></Td><Td>{row.completion_percent ?? '—'}</Td>
                <Td>{row.last_update}</Td><Td><PmBadge value={row.health} /></Td>
                <Td>
                  <Link className="mr-2 text-secondary" href={`/admin/pm/projects/${row.id}`}>View</Link>
                  <Link className="mr-2 text-secondary" href={`/admin/pm/projects/${row.id}/edit`}>Edit</Link>
                  <button className="text-rose-600" onClick={() => archive(row.id)}>Archive</button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PmShell>
  );
}
