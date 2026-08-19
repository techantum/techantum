'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import AdminBadge from '@/components/admin/AdminBadge';
import { adminInputClass, adminSelectClass } from '@/components/admin/AdminField';
import { OPS_PROJECT_TYPES, TICKET_STATUS_LABELS, TICKET_TYPE_LABELS, isClosedStatus } from '@/lib/ops/config';
import { todayISO } from '@/lib/ops/working-days';
import type { OpsTicket } from '@/lib/ops/types';

const PAGE_SIZE = 20;

export default function OpsTicketsPage() {
  const [rows, setRows] = useState<OpsTicket[]>([]);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', status: '', type: '', projectType: '', from: '', to: '' });
  const [error, setError] = useState('');
  const today = todayISO();

  const load = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    fetch(`/api/admin/ops/tickets?${params}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Failed to load');
        setRows(body);
        setPage(1);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  };

  useEffect(() => { load(); }, []);

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, page]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  return (
    <div className="space-y-6 max-w-7xl">
      <AdminPageHeader
        title="Tickets"
        description="Features, enhancements, and bugs across delivery projects."
        action={<Link href="/admin/ops/create"><AdminButton variant="primary">+ Create Ticket</AdminButton></Link>}
      />
      {error && <p className="text-sm text-rose-700">{error}</p>}
      <AdminSection title="Filters">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <input className={adminInputClass} placeholder="Search" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <select className={adminSelectClass} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All statuses</option>
            {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select className={adminSelectClass} value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">All types</option>
            {Object.entries(TICKET_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select className={adminSelectClass} value={filters.projectType} onChange={(e) => setFilters({ ...filters, projectType: e.target.value })}>
            <option value="">All project types</option>
            {OPS_PROJECT_TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
          <input type="date" className={adminInputClass} value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          <input type="date" className={adminInputClass} value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        </div>
        <AdminButton className="mt-3" onClick={load}>Apply filters</AdminButton>
      </AdminSection>
      <AdminSection title={`${rows.length} ticket(s)`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-2 pr-3">Ticket ID</th>
                <th className="py-2 pr-3">Client</th>
                <th className="py-2 pr-3">Project</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Title</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Hours</th>
                <th className="py-2 pr-3">Devs</th>
                <th className="py-2 pr-3">Start</th>
                <th className="py-2 pr-3">Delivery</th>
                <th className="py-2 pr-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((row) => {
                const overdue = !isClosedStatus(row.status) && row.current_end_date < today;
                return (
                  <tr key={row.id} className="border-b border-border/60 align-top">
                    <td className="py-2 pr-3 font-mono text-xs">{row.ticket_code}</td>
                    <td className="py-2 pr-3">{row.ops_clients?.name}</td>
                    <td className="py-2 pr-3">{row.ops_projects?.project_name}</td>
                    <td className="py-2 pr-3">{TICKET_TYPE_LABELS[row.ticket_type]}</td>
                    <td className="py-2 pr-3"><Link className="text-indigo-600 hover:underline" href={`/admin/ops/tickets/${row.id}`}>{row.title}</Link></td>
                    <td className="py-2 pr-3">
                      <AdminBadge variant={overdue ? 'rose' : 'indigo'}>{TICKET_STATUS_LABELS[row.status]}</AdminBadge>
                      {overdue && <span className="block text-xs text-rose-700 font-semibold">Overdue</span>}
                    </td>
                    <td className="py-2 pr-3">{row.estimated_hours}</td>
                    <td className="py-2 pr-3">{row.developers_count}</td>
                    <td className="py-2 pr-3">{row.start_date}</td>
                    <td className="py-2 pr-3">{row.current_end_date}</td>
                    <td className="py-2 pr-3">{row.created_at?.slice(0, 10)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2 pt-3">
          <AdminButton size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</AdminButton>
          <span className="text-xs text-muted-foreground">Page {page} of {pages}</span>
          <AdminButton size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</AdminButton>
        </div>
      </AdminSection>
    </div>
  );
}
