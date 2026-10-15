'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminButton from '@/components/admin/AdminButton';
import { EmptyRecords, FilterBar, FilterSearch, FilterSelect, useListFilters } from '@/components/admin/ListFilters';
import { FinanceShell, FinanceTd, FinanceTh, Pager, StatusBadge, TypePill } from '@/components/admin/finance/FinanceUi';
import { CLIENT_TYPES, clientTypeLabel } from '@/lib/finance/client-types';
import { useMasterItems } from '@/components/admin/useMasterItems';
import Icon from '@/components/ui/AppIcon';

const clientFilters = { q: '', clientType: '', country: '', status: '' };

export default function FinanceClientsPage() {
  const filters = useListFilters(clientFilters);
  const clientTypes = useMasterItems('client_type', CLIENT_TYPES.map((type) => ({ value: type.value, label: type.label })));
  const statuses = useMasterItems('record_status', [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [menuId, setMenuId] = useState('');
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

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
    filters.reload();
  };

  useEffect(() => {
    const params = new URLSearchParams({ detailed: '1', page: String(filters.applied.page) });
    if (filters.applied.q) params.set('q', filters.applied.q);
    if (filters.applied.clientType) params.set('clientType', filters.applied.clientType);
    if (filters.applied.country) params.set('country', filters.applied.country);
    if (filters.applied.status) params.set('status', filters.applied.status);
    fetch(`/api/admin/finance/clients?${params}`).then((r) => r.json()).then((b) => {
      setRows(b.rows || []);
      setCountries(b.countries || []);
      setTotal(b.total || 0);
    });
  }, [filters.applied]);

  return (
    <FinanceShell>
      <AdminPageHeader
        title="Clients"
        description="Reusable billing clients for invoices. Indian and international records are supported."
        action={<Link href="/admin/finance/clients/new"><AdminButton variant="primary">+ Add Client</AdminButton></Link>}
      />
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <FilterBar plain onSearch={filters.search} onClear={filters.clear}>
        <FilterSearch value={filters.draft.q} onChange={(value) => filters.set('q', value)} placeholder="Search by name, GSTIN, email, or phone..." />
        <FilterSelect icon="BuildingOffice2Icon" value={filters.draft.clientType} onChange={(value) => filters.set('clientType', value)} className="w-48">
          <option value="">All client types</option>
          {clientTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
        </FilterSelect>
        <FilterSelect icon="GlobeAltIcon" value={filters.draft.country} onChange={(value) => filters.set('country', value)} className="w-44">
          <option value="">All countries</option>
          {countries.map((country) => <option key={country} value={country}>{country}</option>)}
        </FilterSelect>
        <FilterSelect value={filters.draft.status} onChange={(value) => filters.set('status', value)} className="w-40">
          <option value="">All statuses</option>
          {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
        </FilterSelect>
      </FilterBar>
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="font-semibold text-slate-900">Clients</h2>
        <p className="text-xs text-slate-400">{total} client account{total === 1 ? '' : 's'}</p>
      </div>
        {error && <p className="px-5 pt-3 text-sm text-rose-700">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr>
                <FinanceTh>Client name</FinanceTh>
                <FinanceTh>Client type</FinanceTh>
                <FinanceTh>Contact person</FinanceTh>
                <FinanceTh>Country</FinanceTh>
                <FinanceTh>Email</FinanceTh>
                <FinanceTh>Phone</FinanceTh>
                <FinanceTh>GSTIN / tax number</FinanceTh>
                <FinanceTh>Status</FinanceTh>
                <FinanceTh>Actions</FinanceTh>
              </tr>
            </thead>
            {rows.length > 0 && (
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <FinanceTd><span className="font-semibold text-slate-900">{r.name}</span></FinanceTd>
                  <FinanceTd><TypePill>{clientTypeLabel(r.client_type)}</TypePill></FinanceTd>
                  <FinanceTd>{r.contact_person || '—'}</FinanceTd>
                  <FinanceTd>{r.country || '—'}</FinanceTd>
                  <FinanceTd>{r.email || '—'}</FinanceTd>
                  <FinanceTd>{r.contact_number || '—'}</FinanceTd>
                  <FinanceTd>{r.gstin || '—'}</FinanceTd>
                  <FinanceTd><StatusBadge value={r.status || 'active'} /></FinanceTd>
                  <FinanceTd>
                    <div className="relative flex items-center gap-1">
                      <Link href={`/admin/finance/clients/${r.id}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="View client">
                        <Icon name="EyeIcon" size={16} />
                      </Link>
                      <Link href={`/admin/finance/clients/${r.id}/edit`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Edit client">
                        <Icon name="PencilSquareIcon" size={16} />
                      </Link>
                      <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="More actions" onClick={() => setMenuId(menuId === r.id ? '' : r.id)}>
                        <Icon name="EllipsisVerticalIcon" size={16} />
                      </button>
                      {menuId === r.id && (
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          className="absolute right-0 top-9 z-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg"
                          onClick={() => { setMenuId(''); setClientStatus(r.id, r.status === 'inactive' ? 'active' : 'inactive'); }}
                        >
                          {r.status === 'inactive' ? 'Enable' : 'Disable'}
                        </button>
                      )}
                    </div>
                  </FinanceTd>
                </tr>
              ))}
            </tbody>
            )}
          </table>
        </div>
        {rows.length === 0 && (
          <EmptyRecords title="No clients found" description="Try adjusting your filters or add a client." action={<Link href="/admin/finance/clients/new"><AdminButton variant="primary">Add Client</AdminButton></Link>} />
        )}
        <div className="px-5 pb-4"><Pager page={filters.applied.page} pageSize={25} total={total} onPage={filters.setPage} /></div>
      </section>
    </FinanceShell>
  );
}
