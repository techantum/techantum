'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import AdminBadge from '@/components/admin/AdminBadge';
import { adminInputClass, adminSelectClass } from '@/components/admin/AdminField';
import { OpsPageShell, OpsStatusBadge, OpsTd, OpsTh } from '@/components/admin/ops/OpsUi';
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
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    fetch(`/api/admin/ops/tickets?${params}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Failed to load');
        setRows(body);
        setPage(1);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  };

  useEffect(() => {
    load();
  }, []);

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, page]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  return (
    <OpsPageShell>
      <AdminPageHeader
        title="Tickets"
        description="Features, enhancements, and bugs across delivery projects."
        action={
          <Link href="/admin/ops/create">
            <AdminButton variant="primary">+ Create Ticket</AdminButton>
          </Link>
        }
      />
      {error && <p className="text-sm text-rose-700">{error}</p>}

      <AdminSection title="Filters">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <input
            className={adminInputClass}
            placeholder="Search"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <select className={adminSelectClass} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All statuses</option>
            {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select className={adminSelectClass} value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">All types</option>
            {Object.entries(TICKET_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select className={adminSelectClass} value={filters.projectType} onChange={(e) => setFilters({ ...filters, projectType: e.target.value })}>
            <option value="">All project types</option>
            {OPS_PROJECT_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
          <input type="date" className={adminInputClass} value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          <input type="date" className={adminInputClass} value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        </div>
        <AdminButton className="mt-2" onClick={load}>
          Apply filters
        </AdminButton>
      </AdminSection>

      <AdminSection title={`${rows.length} ticket(s)`}>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No tickets found.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <OpsTh>ID</OpsTh>
                  <OpsTh>Client</OpsTh>
                  <OpsTh>Project</OpsTh>
                  <OpsTh>Type</OpsTh>
                  <OpsTh>Title</OpsTh>
                  <OpsTh>Status</OpsTh>
                  <OpsTh>Hrs</OpsTh>
                  <OpsTh>Devs</OpsTh>
                  <OpsTh>Start</OpsTh>
                  <OpsTh>Delivery</OpsTh>
                </tr>
              </thead>
              <tbody>
                {paged.map((row) => {
                  const overdue = !isClosedStatus(row.status) && row.current_end_date < today;
                  return (
                    <tr key={row.id} className="hover:bg-muted/20 align-top">
                      <OpsTd className="font-mono text-[11px]">{row.ticket_code}</OpsTd>
                      <OpsTd>{row.ops_clients?.name}</OpsTd>
                      <OpsTd className="max-w-[120px] truncate">{row.ops_projects?.project_name}</OpsTd>
                      <OpsTd>
                        <AdminBadge variant="default">{TICKET_TYPE_LABELS[row.ticket_type]}</AdminBadge>
                      </OpsTd>
                      <OpsTd>
                        <Link className="text-indigo-600 hover:underline font-medium" href={`/admin/ops/tickets/${row.id}`}>
                          {row.title}
                        </Link>
                      </OpsTd>
                      <OpsTd>
                        <OpsStatusBadge label={TICKET_STATUS_LABELS[row.status]} overdue={overdue} />
                      </OpsTd>
                      <OpsTd>{row.estimated_hours}</OpsTd>
                      <OpsTd>{row.developers_count}</OpsTd>
                      <OpsTd className="whitespace-nowrap">{row.start_date}</OpsTd>
                      <OpsTd className="whitespace-nowrap">{row.current_end_date}</OpsTd>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center gap-2 pt-2">
          <AdminButton size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </AdminButton>
          <span className="text-xs text-muted-foreground">
            Page {page} of {pages}
          </span>
          <AdminButton size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </AdminButton>
        </div>
      </AdminSection>
    </OpsPageShell>
  );
}
