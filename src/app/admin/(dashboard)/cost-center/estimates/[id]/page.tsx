'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminButton from '@/components/admin/AdminButton';
import AdminAlert from '@/components/admin/AdminAlert';
import { CcBadge, CcShell, Panel, Td, Th, money, pct } from '@/components/admin/cost-center/ui';

export default function EstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [estimate, setEstimate] = useState<Record<string, unknown> | null>(null);
  const [audit, setAudit] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = () => {
    fetch(`/api/admin/cost-center/estimates/${id}`)
      .then((r) => r.json())
      .then((body) => {
        if (body.error) setError(body.error);
        else setEstimate(body);
      });
    fetch(`/api/admin/cost-center/estimates/${id}/audit`)
      .then((r) => r.json())
      .then((body) => setAudit(body.rows || []));
  };

  useEffect(load, [id]);

  const setStatus = async (status: string) => {
    setBusy(status);
    setError('');
    const res = await fetch(`/api/admin/cost-center/estimates/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy('');
    if (!res.ok) {
      setError(body.error || 'Could not update status');
      return;
    }
    load();
  };

  if (!estimate && !error) {
    return <p className="text-sm text-slate-500">Loading estimate…</p>;
  }

  return (
    <CcShell>
      <AdminPageHeader
        title={String(estimate?.estimate_name || 'Estimate')}
        backHref="/admin/cost-center/estimates"
        action={
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/cost-center/estimates/${id}/edit`}>
              <AdminButton variant="secondary">Edit</AdminButton>
            </Link>
            {estimate?.status !== 'approved' ? (
              <AdminButton onClick={() => setStatus('approved')} disabled={!!busy}>
                Approve
              </AdminButton>
            ) : null}
            {estimate?.status === 'approved' ? (
              <AdminButton onClick={() => setStatus('converted')} disabled={!!busy}>
                Mark Converted
              </AdminButton>
            ) : null}
            {estimate?.status !== 'archived' ? (
              <AdminButton variant="secondary" onClick={() => setStatus('archived')} disabled={!!busy}>
                Archive
              </AdminButton>
            ) : null}
          </div>
        }
      />

      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Code / Status</p>
          <p className="mt-1 font-semibold text-slate-900">{String(estimate?.estimate_code)}</p>
          <div className="mt-1">
            <CcBadge value={String(estimate?.status || '')} />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Client / Project</p>
          <p className="mt-1 font-semibold text-slate-900">{String(estimate?.client_name || '—')}</p>
          <p className="text-sm text-slate-500">{String(estimate?.project_name || 'Opportunity')}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Hours</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {Number(estimate?.final_approved_hours || 0).toFixed(2)}
          </p>
          <p className="text-xs text-slate-500">
            System {Number(estimate?.system_estimated_hours || 0).toFixed(2)} · Adjusted{' '}
            {estimate?.adjusted_hours != null ? Number(estimate.adjusted_hours).toFixed(2) : '—'}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Internal Cost</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{money(estimate?.total_internal_cost)}</p>
          <p className="text-xs text-slate-500">Margin {pct(estimate?.profit_margin_pct)}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Scope">
          <div className="space-y-2 p-4 text-sm text-slate-700">
            <p>
              <span className="text-slate-400">Type:</span> {String(estimate?.project_type || '—')}
            </p>
            <p>
              <span className="text-slate-400">Complexity:</span> {String(estimate?.complexity || '—')}
            </p>
            <p>
              <span className="text-slate-400">Modules / Screens / APIs:</span>{' '}
              {String(estimate?.modules_count)} / {String(estimate?.screens_count)} / {String(estimate?.apis_count)}
            </p>
            <p className="whitespace-pre-wrap">{String(estimate?.scope_summary || 'No scope summary')}</p>
          </div>
        </Panel>
        <Panel title="Cost Breakdown">
          <div className="space-y-2 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Resource cost</span>
              <span className="font-medium">{money(estimate?.resource_cost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Operational cost</span>
              <span className="font-medium">{money(estimate?.project_operational_cost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Additional cost</span>
              <span className="font-medium">{money(estimate?.additional_cost)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2">
              <span className="font-semibold">Total internal</span>
              <span className="font-semibold">{money(estimate?.total_internal_cost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Client price</span>
              <span className="font-medium">{money(estimate?.proposed_client_price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Expected profit</span>
              <span className="font-medium text-emerald-700">{money(estimate?.expected_profit)}</span>
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Team Allocation">
        <table className="min-w-full">
          <thead>
            <tr>
              <Th>Role</Th>
              <Th>Employee</Th>
              <Th>Designation</Th>
              <Th>Hourly</Th>
              <Th>Hours</Th>
              <Th>Alloc %</Th>
              <Th>Cost</Th>
            </tr>
          </thead>
          <tbody>
            {((estimate?.resources as Record<string, unknown>[]) || []).length === 0 ? (
              <tr>
                <Td className="text-slate-400">No resources</Td>
                <Td>—</Td>
                <Td>—</Td>
                <Td>—</Td>
                <Td>—</Td>
                <Td>—</Td>
                <Td>—</Td>
              </tr>
            ) : (
              ((estimate?.resources as Record<string, unknown>[]) || []).map((row) => (
                <tr key={String(row.id)}>
                  <Td>{String(row.role_label)}</Td>
                  <Td>{String(row.employee_name || '—')}</Td>
                  <Td>{String(row.designation || '—')}</Td>
                  <Td>{money(row.hourly_cost)}</Td>
                  <Td>{Number(row.planned_hours || 0).toFixed(1)}</Td>
                  <Td>{Number(row.allocation_pct || 0).toFixed(0)}%</Td>
                  <Td>{money(row.total_resource_cost)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>

      <Panel title="Audit Trail">
        <table className="min-w-full">
          <thead>
            <tr>
              <Th>When</Th>
              <Th>Action</Th>
              <Th>User</Th>
            </tr>
          </thead>
          <tbody>
            {audit.length === 0 ? (
              <tr>
                <Td className="text-slate-400">No audit entries</Td>
                <Td>—</Td>
                <Td>—</Td>
              </tr>
            ) : (
              audit.map((row) => (
                <tr key={String(row.id)}>
                  <Td>{row.created_at ? new Date(String(row.created_at)).toLocaleString() : '—'}</Td>
                  <Td className="capitalize">{String(row.action).replaceAll('_', ' ')}</Td>
                  <Td>{String(row.user_email || '—')}</Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>
    </CcShell>
  );
}
