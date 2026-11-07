'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminButton from '@/components/admin/AdminButton';
import { CcBadge, CcShell, Panel, Stat, Td, Th, money, pct } from '@/components/admin/cost-center/ui';

type Dashboard = {
  totals: {
    total_estimates: number;
    draft_estimates: number;
    approved_estimates: number;
    average_project_cost: number;
    resource_cost: number;
    operational_cost: number;
    estimated_margin: number;
  };
  recent: Record<string, unknown>[];
};

export default function CostCenterDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/cost-center/dashboard')
      .then((r) => r.json())
      .then((body) => {
        if (body.error) setError(body.error);
        else setData(body);
      })
      .catch(() => setError('Could not load dashboard'));
  }, []);

  const t = data?.totals;

  return (
    <CcShell>
      <AdminPageHeader
        title="Cost Center"
        action={
          <div className="flex gap-2">
            <Link href="/admin/cost-center/calculator">
              <AdminButton variant="secondary">Calculator</AdminButton>
            </Link>
            <Link href="/admin/cost-center/estimates/new">
              <AdminButton>+ New Estimate</AdminButton>
            </Link>
          </div>
        }
      />
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total Estimates" value={t?.total_estimates ?? '—'} href="/admin/cost-center/estimates" />
        <Stat label="Draft" value={t?.draft_estimates ?? '—'} href="/admin/cost-center/estimates?status=draft" />
        <Stat label="Approved" value={t?.approved_estimates ?? '—'} href="/admin/cost-center/estimates?status=approved" />
        <Stat label="Avg Project Cost" value={money(t?.average_project_cost)} />
        <Stat label="Resource Cost" value={money(t?.resource_cost)} />
        <Stat label="Operational Cost" value={money(t?.operational_cost)} />
        <Stat label="Estimated Margin" value={pct(t?.estimated_margin)} />
      </div>

      <Panel
        title="Recent Estimates"
        action={
          <Link href="/admin/cost-center/estimates" className="text-sm font-medium text-secondary">
            View all
          </Link>
        }
      >
        <table className="min-w-full">
          <thead>
            <tr>
              <Th>Project</Th>
              <Th>Client</Th>
              <Th>Hours</Th>
              <Th>Resource</Th>
              <Th>Ops</Th>
              <Th>Total</Th>
              <Th>Client Price</Th>
              <Th>Margin</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {(data?.recent || []).length === 0 ? (
              <tr>
                <Td className="text-slate-400">No estimates yet</Td>
                <Td>—</Td>
                <Td>—</Td>
                <Td>—</Td>
                <Td>—</Td>
                <Td>—</Td>
                <Td>—</Td>
                <Td>—</Td>
                <Td>—</Td>
              </tr>
            ) : (
              (data?.recent || []).map((row) => (
                <tr key={String(row.id)}>
                  <Td>
                    <Link className="font-medium text-secondary" href={`/admin/cost-center/estimates/${row.id}`}>
                      {String(row.project_name || row.estimate_name || '—')}
                    </Link>
                  </Td>
                  <Td>{String(row.client_name || '—')}</Td>
                  <Td>{Number(row.final_approved_hours || 0).toFixed(1)}</Td>
                  <Td>{money(row.resource_cost)}</Td>
                  <Td>{money(row.project_operational_cost)}</Td>
                  <Td>{money(row.total_internal_cost)}</Td>
                  <Td>{money(row.proposed_client_price)}</Td>
                  <Td>{pct(row.profit_margin_pct)}</Td>
                  <Td>
                    <CcBadge value={String(row.status || '')} />
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>
    </CcShell>
  );
}
