'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import AdminBadge from '@/components/admin/AdminBadge';
import { FilterBar, FilterDate, FilterSearch, FilterSelect } from '@/components/admin/ListFilters';
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

  const load = (next = filters) => {
    const params = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => {
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

      <FilterBar
        onSearch={() => load()}
        onClear={() => {
          const empty = { search: '', status: '', type: '', projectType: '', from: '', to: '' };
          setFilters(empty);
          load(empty);
        }}
      >
        <FilterSearch value={filters.search} onChange={(value) => setFilters({ ...filters, search: value })} placeholder="Search tickets..." />
        <FilterSelect value={filters.status} onChange={(value) => setFilters({ ...filters, status: value })}>
          <option value="">All statuses</option>
          {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </FilterSelect>
        <FilterSelect icon="TagIcon" value={filters.type} onChange={(value) => setFilters({ ...filters, type: value })}>
          <option value="">All types</option>
          {Object.entries(TICKET_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </FilterSelect>
        <FilterSelect icon="RectangleStackIcon" value={filters.projectType} onChange={(value) => setFilters({ ...filters, projectType: value })} className="w-48">
          <option value="">All project types</option>
          {OPS_PROJECT_TYPES.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </FilterSelect>
        <FilterDate ariaLabel="From" value={filters.from} onChange={(value) => setFilters({ ...filters, from: value })} />
        <FilterDate ariaLabel="To" value={filters.to} onChange={(value) => setFilters({ ...filters, to: value })} />
      </FilterBar>

      <AdminSection title={`${rows.length} ticket(s)`}>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No tickets found.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <OpsTh>ID</OpsTh>
                  <OpsTh>Title</OpsTh>
                  <OpsTh>Client</OpsTh>
                  <OpsTh>Type</OpsTh>
                  <OpsTh>Status</OpsTh>
                  <OpsTh>Delivery</OpsTh>
                </tr>
              </thead>
              <tbody>
                {paged.map((row) => {
                  const overdue = !isClosedStatus(row.status) && row.current_end_date < today;
                  return (
                    <tr key={row.id} className="hover:bg-muted/20 align-top">
                      <OpsTd className="font-mono text-[11px]">{row.ticket_code}</OpsTd>
                      <OpsTd>
                        <Link className="font-semibold text-slate-900 hover:underline" href={`/admin/ops/tickets/${row.id}`}>
                          {row.title}
                        </Link>
                        <p className="text-xs text-slate-400">{row.ops_projects?.project_name}</p>
                      </OpsTd>
                      <OpsTd>{row.ops_clients?.name}</OpsTd>
                      <OpsTd>
                        <AdminBadge variant="sky">{TICKET_TYPE_LABELS[row.ticket_type]}</AdminBadge>
                      </OpsTd>
                      <OpsTd>
                        <OpsStatusBadge label={TICKET_STATUS_LABELS[row.status]} overdue={overdue} />
                      </OpsTd>
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
