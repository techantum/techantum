'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import { adminInputClass, adminSelectClass } from '@/components/admin/AdminField';
import { FinanceShell, FinanceTd, FinanceTh, Pager, StatusBadge, money } from '@/components/admin/finance/FinanceUi';
import { clientTypeLabel } from '@/lib/finance/client-types';

export default function FinanceClientsPage() {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = () => {
    const params = new URLSearchParams({ detailed: '1', page: String(page) });
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    fetch(`/api/admin/finance/clients?${params}`).then((r) => r.json()).then((b) => {
      setRows(b.rows || []);
      setTotal(b.total || 0);
    });
  };

  const setClientStatus = async (id: string, nextStatus: string) => {
    setBusyId(id);
    setError('');
    const res = await fetch(`/api/admin/finance/clients/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    const body = await res.json().catch(() => ({}));
    setBusyId('');
    if (!res.ok) {
      setError(body.error || 'Could not update client status');
      return;
    }
    load();
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  return (
    <FinanceShell>
      <AdminPageHeader
        title="Clients"
        description="Reusable billing clients for invoices. Indian and international records are supported."
        action={<Link href="/admin/finance/clients/new"><AdminButton variant="primary">+ Add Client</AdminButton></Link>}
      />
      <AdminSection title="Clients">
        <div className="mb-3 flex flex-wrap gap-2">
          <input className={`${adminInputClass} max-w-sm`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, GSTIN, email" onKeyDown={(e) => e.key === 'Enter' && load()} />
          <select className={`${adminSelectClass} w-40`} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <AdminButton onClick={load}>Search</AdminButton>
        </div>
        {error && <p className="mb-3 text-sm text-rose-700">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr>
                <FinanceTh>Client / Company Name</FinanceTh>
                <FinanceTh>Client Type</FinanceTh>
                <FinanceTh>Contact Person</FinanceTh>
                <FinanceTh>Country</FinanceTh>
                <FinanceTh>State / Region</FinanceTh>
                <FinanceTh>Email</FinanceTh>
                <FinanceTh>Phone</FinanceTh>
                <FinanceTh>GSTIN / Tax Number</FinanceTh>
                <FinanceTh>Status</FinanceTh>
                <FinanceTh>Invoices</FinanceTh>
                <FinanceTh>Total Invoiced</FinanceTh>
                <FinanceTh>Outstanding</FinanceTh>
                <FinanceTh>Actions</FinanceTh>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <FinanceTd>{r.name}</FinanceTd>
                  <FinanceTd>{clientTypeLabel(r.client_type)}</FinanceTd>
                  <FinanceTd>{r.contact_person || '—'}</FinanceTd>
                  <FinanceTd>{r.country || '—'}</FinanceTd>
                  <FinanceTd>{r.state || '—'}</FinanceTd>
                  <FinanceTd>{r.email || '—'}</FinanceTd>
                  <FinanceTd>{r.contact_number || '—'}</FinanceTd>
                  <FinanceTd>{r.gstin || '—'}</FinanceTd>
                  <FinanceTd><StatusBadge value={r.status || 'active'} /></FinanceTd>
                  <FinanceTd>{r.invoice_count || 0}</FinanceTd>
                  <FinanceTd>{money(r.total_invoiced)}</FinanceTd>
                  <FinanceTd>{money(r.outstanding_amount)}</FinanceTd>
                  <FinanceTd>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/finance/clients/${r.id}`}>
                        <AdminButton size="sm">View</AdminButton>
                      </Link>
                      <Link href={`/admin/finance/clients/${r.id}/edit`}>
                        <AdminButton size="sm">Edit</AdminButton>
                      </Link>
                      <AdminButton
                        size="sm"
                        variant={r.status === 'inactive' ? 'success' : 'secondary'}
                        disabled={busyId === r.id}
                        onClick={() => setClientStatus(r.id, r.status === 'inactive' ? 'active' : 'inactive')}
                      >
                        {r.status === 'inactive' ? 'Enable' : 'Disable'}
                      </AdminButton>
                    </div>
                  </FinanceTd>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={page} pageSize={25} total={total} onPage={setPage} />
      </AdminSection>
    </FinanceShell>
  );
}
