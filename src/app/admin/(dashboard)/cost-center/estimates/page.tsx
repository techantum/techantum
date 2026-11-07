'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminButton from '@/components/admin/AdminButton';
import { EmptyRecords, FilterBar, FilterSearch, FilterSelect, useListFilters } from '@/components/admin/ListFilters';
import { CcBadge, CcShell, Panel, Td, Th, money, pct } from '@/components/admin/cost-center/ui';
import { STATUS_LABELS } from '@/lib/cost-center/types';

function EstimatesContent() {
  const search = useSearchParams();
  const filters = useListFilters({ q: '', status: search?.get('status') || '' });
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams({
      page: String(filters.applied.page || 1),
      pageSize: '25',
    });
    if (filters.applied.q) params.set('q', filters.applied.q);
    if (filters.applied.status) params.set('status', filters.applied.status);
    fetch(`/api/admin/cost-center/estimates?${params}`)
      .then((r) => r.json())
      .then((body) => {
        setRows(body.rows || []);
        setTotal(body.total || 0);
      });
  }, [filters.applied]);

  return (
    <CcShell>
      <AdminPageHeader
        title="Estimates"
        action={
          <Link href="/admin/cost-center/estimates/new">
            <AdminButton>+ New Estimate</AdminButton>
          </Link>
        }
      />

      <FilterBar plain onSearch={filters.search} onClear={filters.clear}>
        <FilterSearch value={filters.draft.q} onChange={(value) => filters.set('q', value)} placeholder="Search estimates" />
        <FilterSelect value={filters.draft.status} onChange={(value) => filters.set('status', value)} className="w-48">
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </FilterSelect>
      </FilterBar>

      <Panel title={`Estimates (${total})`}>
        {rows.length === 0 ? (
          <EmptyRecords title="No estimates" description="Create an estimate to plan internal project cost." />
        ) : (
          <table className="min-w-full">
            <thead>
              <tr>
                <Th>Code</Th>
                <Th>Estimate</Th>
                <Th>Client</Th>
                <Th>Project</Th>
                <Th>Hours</Th>
                <Th>Total Cost</Th>
                <Th>Margin</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={String(row.id)}>
                  <Td>{String(row.estimate_code)}</Td>
                  <Td>
                    <Link className="font-medium text-secondary" href={`/admin/cost-center/estimates/${row.id}`}>
                      {String(row.estimate_name)}
                    </Link>
                  </Td>
                  <Td>{String(row.client_name || '—')}</Td>
                  <Td>{String(row.project_name || '—')}</Td>
                  <Td>{Number(row.final_approved_hours || 0).toFixed(1)}</Td>
                  <Td>{money(row.total_internal_cost)}</Td>
                  <Td>{pct(row.profit_margin_pct)}</Td>
                  <Td>
                    <CcBadge value={String(row.status)} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </CcShell>
  );
}

export default function EstimatesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading estimates…</p>}>
      <EstimatesContent />
    </Suspense>
  );
}
