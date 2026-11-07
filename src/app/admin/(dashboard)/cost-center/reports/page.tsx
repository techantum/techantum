'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminButton from '@/components/admin/AdminButton';
import { FilterBar, FilterSelect, useListFilters } from '@/components/admin/ListFilters';
import { CcShell, Panel, Td, Th, money } from '@/components/admin/cost-center/ui';

const REPORTS = [
  { value: 'project_cost', label: 'Project Cost Report' },
  { value: 'resource_cost', label: 'Resource Cost Report' },
  { value: 'role_cost', label: 'Role Cost Report' },
  { value: 'operational_cost', label: 'Operational Cost Report' },
  { value: 'profitability', label: 'Profitability Report' },
];

export default function CostCenterReportsPage() {
  const filters = useListFilters({ type: 'project_cost' });
  const [report, setReport] = useState<{ title?: string; rows?: Record<string, unknown>[]; columns?: { key: string; header: string }[]; meta?: Record<string, unknown> } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    fetch(`/api/admin/cost-center/reports?type=${filters.applied.type}`)
      .then((r) => r.json())
      .then((body) => setReport(body))
      .finally(() => setLoading(false));
  };

  useEffect(load, [filters.applied]);

  const exportExcel = () => {
    window.location.href = `/api/admin/cost-center/reports/export?type=${filters.applied.type}`;
  };

  const columns = report?.columns || [];
  const rows = report?.rows || [];

  return (
    <CcShell>
      <AdminPageHeader
        title="Cost Center Reports"
        action={
          <AdminButton variant="primary" onClick={exportExcel}>
            Export Excel
          </AdminButton>
        }
      />

      <FilterBar onSearch={filters.search} onClear={filters.clear}>
        <FilterSelect icon="DocumentChartBarIcon" value={filters.draft.type} onChange={(value) => filters.set('type', value)} className="w-72">
          {REPORTS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </FilterSelect>
      </FilterBar>

      {report?.meta ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          Monthly ops {money(report.meta.monthly_operational_cost)} · Productive hours{' '}
          {Number(report.meta.productive_hours_per_month || 0).toFixed(1)} · Ops/hour{' '}
          {money(report.meta.operational_cost_per_hour)}
        </div>
      ) : null}

      <Panel title={report?.title || 'Report'}>
        {loading ? (
          <p className="p-4 text-sm text-slate-500">Loading…</p>
        ) : (
          <table className="min-w-full">
            <thead>
              <tr>
                {columns.map((col) => (
                  <Th key={col.key}>{col.header}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <Td className="text-slate-400">No rows</Td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={idx}>
                    {columns.map((col) => {
                      const value = row[col.key];
                      const moneyKeys = ['resource_cost', 'project_operational_cost', 'additional_cost', 'total_internal_cost', 'proposed_client_price', 'expected_profit', 'hourly_cost', 'total_cost', 'total_resource_cost', 'default_hourly', 'avg_hourly', 'monthly_amount'];
                      return (
                        <Td key={col.key}>
                          {moneyKeys.includes(col.key)
                            ? money(value)
                            : value == null || value === ''
                              ? '—'
                              : String(value)}
                        </Td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </Panel>
      <p className="text-xs text-slate-400">Estimate vs Actual report will be available after delivery tracking is linked.</p>
    </CcShell>
  );
}
