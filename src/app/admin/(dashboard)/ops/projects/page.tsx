'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import AdminBadge from '@/components/admin/AdminBadge';
import { FilterBar, FilterSearch, FilterSelect } from '@/components/admin/ListFilters';
import { OpsPageShell, OpsStatusBadge, OpsTd, OpsTh } from '@/components/admin/ops/OpsUi';
import { PROJECT_STATUS_LABELS, isClosedStatus } from '@/lib/ops/config';
import { todayISO } from '@/lib/ops/working-days';
import type { OpsProject } from '@/lib/ops/types';

export default function OpsProjectsPage() {
  const [rows, setRows] = useState<OpsProject[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const today = todayISO();

  const load = (next: { search?: string; status?: string } = {}) => {
    const query = next.search ?? search;
    const nextStatus = next.status ?? status;
    const params = new URLSearchParams();
    if (query) params.set('search', query);
    if (nextStatus) params.set('status', nextStatus);
    fetch(`/api/admin/ops/projects?${params}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Failed to load');
        setRows(body);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <OpsPageShell>
      <AdminPageHeader
        title="Delivery projects"
        description="Onboarded client projects with estimates and delivery dates."
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
          setSearch('');
          setStatus('');
          load({ search: '', status: '' });
        }}
      >
        <FilterSearch value={search} onChange={setSearch} placeholder="Search projects..." />
        <FilterSelect value={status} onChange={setStatus}>
          <option value="">All statuses</option>
          {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </FilterSelect>
      </FilterBar>
      <AdminSection title={`${rows.length} project(s)`}>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No delivery projects yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <OpsTh>ID</OpsTh>
                  <OpsTh>Client</OpsTh>
                  <OpsTh>Project</OpsTh>
                  <OpsTh>Status</OpsTh>
                  <OpsTh>Start</OpsTh>
                  <OpsTh>Delivery</OpsTh>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const overdue = !isClosedStatus(row.status) && row.current_end_date < today;
                  return (
                    <tr key={row.id} className="hover:bg-muted/20">
                      <OpsTd className="font-mono text-[11px]">{row.project_code}</OpsTd>
                      <OpsTd>{row.ops_clients?.name}</OpsTd>
                      <OpsTd>
                        <Link className="text-secondary hover:underline font-medium" href={`/admin/ops/projects/${row.id}`}>
                          {row.project_name}
                        </Link>
                      </OpsTd>
                      <OpsTd>
                        <OpsStatusBadge label={PROJECT_STATUS_LABELS[row.status] || row.status} overdue={overdue} />
                      </OpsTd>
                      <OpsTd className="whitespace-nowrap">{row.start_date}</OpsTd>
                      <OpsTd className="whitespace-nowrap">{row.current_end_date}</OpsTd>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>
    </OpsPageShell>
  );
}
