'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import AdminBadge from '@/components/admin/AdminBadge';
import { adminInputClass, adminSelectClass } from '@/components/admin/AdminField';
import { PROJECT_STATUS_LABELS, isClosedStatus } from '@/lib/ops/config';
import { todayISO } from '@/lib/ops/working-days';
import type { OpsProject } from '@/lib/ops/types';

export default function OpsProjectsPage() {
  const [rows, setRows] = useState<OpsProject[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const today = todayISO();

  const load = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    fetch(`/api/admin/ops/projects?${params}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Failed to load');
        setRows(body);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6 max-w-7xl">
      <AdminPageHeader
        title="Delivery projects"
        description="Onboarded client projects with estimates and delivery dates."
        action={<Link href="/admin/ops/create"><AdminButton variant="primary">+ Create Ticket</AdminButton></Link>}
      />
      {error && <p className="text-sm text-rose-700">{error}</p>}
      <AdminSection title="All projects">
        <div className="flex flex-wrap gap-2">
          <input className={`${adminInputClass} max-w-xs`} placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className={`${adminSelectClass} max-w-xs`} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <AdminButton onClick={load}>Filter</AdminButton>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Client</th>
                <th className="py-2 pr-3">Project</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Start</th>
                <th className="py-2 pr-3">Delivery</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const overdue = !isClosedStatus(row.status) && row.current_end_date < today;
                return (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-mono text-xs">{row.project_code}</td>
                    <td className="py-2 pr-3">{row.ops_clients?.name}</td>
                    <td className="py-2 pr-3"><Link className="text-indigo-600 hover:underline" href={`/admin/ops/projects/${row.id}`}>{row.project_name}</Link></td>
                    <td className="py-2 pr-3">
                      <AdminBadge variant={overdue ? 'rose' : 'indigo'}>{PROJECT_STATUS_LABELS[row.status] || row.status}</AdminBadge>
                      {overdue && <span className="ml-2 text-xs font-semibold text-rose-700">Overdue</span>}
                    </td>
                    <td className="py-2 pr-3">{row.start_date}</td>
                    <td className="py-2 pr-3">{row.current_end_date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No delivery projects yet.</p>}
        </div>
      </AdminSection>
    </div>
  );
}
