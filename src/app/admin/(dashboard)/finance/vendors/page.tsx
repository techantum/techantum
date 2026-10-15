'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import AdminField, { adminInputClass, adminSelectClass } from '@/components/admin/AdminField';
import { EmptyRecords, FilterBar, FilterSearch, FilterSelect, useListFilters } from '@/components/admin/ListFilters';
import { FinanceShell, FinanceTd, FinanceTh, Pager } from '@/components/admin/finance/FinanceUi';
import Icon from '@/components/ui/AppIcon';

const vendorFilters = { q: '', city: '', status: '' };

const emptyForm = { vendor_name: '', gstin: '', pan: '', email: '', phone: '', city: '', state: '', status: 'active' };

function StatusPill({ value }: { value?: string }) {
  const active = String(value || 'active').toLowerCase() !== 'inactive';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

export default function VendorsPage() {
  const filters = useListFilters(vendorFilters);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'vendor_name', dir: 'asc' });

  useEffect(() => {
    const params = new URLSearchParams({ page: String(filters.applied.page), pageSize: '25' });
    if (filters.applied.q) params.set('q', filters.applied.q);
    if (filters.applied.city) params.set('city', filters.applied.city);
    if (filters.applied.status) params.set('status', filters.applied.status);
    fetch(`/api/admin/finance/vendors?${params}`)
      .then((r) => r.json())
      .then((body) => {
        setRows(body.rows || []);
        setTotal(body.total || 0);
        setCities(body.cities || []);
      });
  }, [filters.applied]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const left = String(a[sort.key] || '').toLowerCase();
      const right = String(b[sort.key] || '').toLowerCase();
      return sort.dir === 'asc' ? left.localeCompare(right) : right.localeCompare(left);
    });
    return copy;
  }, [rows, sort]);

  const toggleSort = (key: string) => {
    setSort((current) => (current.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
    setError('');
  };

  const startEdit = (row: Record<string, string>) => {
    setEditing(row.id);
    setForm({
      vendor_name: row.vendor_name || '',
      gstin: row.gstin || '',
      pan: row.pan || '',
      email: row.email || '',
      phone: row.phone || '',
      city: row.city || '',
      state: row.state || '',
      status: row.status || 'active',
    });
    setOpen(true);
    setError('');
  };

  const save = async () => {
    setError('');
    const res = await fetch(editing ? `/api/admin/finance/vendors/${editing}` : '/api/admin/finance/vendors', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error || 'Could not save vendor');
      return;
    }
    setOpen(false);
    filters.reload();
  };

  const remove = async (row: Record<string, string>) => {
    if (!window.confirm(`Delete ${row.vendor_name}?`)) return;
    const res = await fetch(`/api/admin/finance/vendors/${row.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || 'Could not delete vendor');
      return;
    }
    filters.reload();
  };

  const heading = (key: string, label: string) => (
    <FinanceTh>
      <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort(key)}>
        {label}
        <Icon name="ChevronUpDownIcon" size={12} />
      </button>
    </FinanceTh>
  );

  return (
    <FinanceShell>
      <AdminPageHeader
        title="Vendors"
        description="Supplier master for bills and expense payments."
        action={<AdminButton variant="primary" onClick={startCreate}>+ Add vendor</AdminButton>}
      />
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <FilterBar plain onSearch={filters.search} onClear={filters.clear}>
        <FilterSearch value={filters.draft.q} onChange={(value) => filters.set('q', value)} placeholder="Search vendor name, GSTIN, PAN, email..." />
        <FilterSelect icon="MapPinIcon" value={filters.draft.city} onChange={(value) => filters.set('city', value)} className="w-44">
          <option value="">All cities</option>
          {cities.map((city) => <option key={city} value={city}>{city}</option>)}
        </FilterSelect>
        <FilterSelect value={filters.draft.status} onChange={(value) => filters.set('status', value)} className="w-40">
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </FilterSelect>
      </FilterBar>
      {open && (
        <AdminSection title={editing ? 'Edit vendor' : 'Add vendor'}>
          {error && <p className="text-sm text-rose-700">{error}</p>}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <AdminField label="Name"><input className={adminInputClass} value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} /></AdminField>
            <AdminField label="GSTIN"><input className={adminInputClass} value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} /></AdminField>
            <AdminField label="PAN"><input className={adminInputClass} value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value })} /></AdminField>
            <AdminField label="City"><input className={adminInputClass} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></AdminField>
            <AdminField label="Phone"><input className={adminInputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></AdminField>
            <AdminField label="Email"><input className={adminInputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></AdminField>
            <AdminField label="Status">
              <select className={adminSelectClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </AdminField>
          </div>
          <div className="mt-3 flex gap-2">
            <AdminButton variant="primary" onClick={save}>{editing ? 'Save changes' : 'Save vendor'}</AdminButton>
            <AdminButton onClick={() => setOpen(false)}>Cancel</AdminButton>
          </div>
        </AdminSection>
      )}
      {!open && error && <p className="text-sm text-rose-700">{error}</p>}
        <div className="overflow-x-auto px-2">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr>
                {heading('vendor_name', 'Vendor name')}
                {heading('gstin', 'GSTIN')}
                {heading('city', 'City')}
                {heading('phone', 'Phone')}
                <FinanceTh>Status</FinanceTh>
                <FinanceTh>Actions</FinanceTh>
              </tr>
            </thead>
            {sorted.length > 0 && (
              <tbody>
                {sorted.map((row, index) => (
                  <tr key={row.id}>
                    <FinanceTd><span className="font-semibold text-slate-900">{row.vendor_name}</span></FinanceTd>
                    <FinanceTd>{row.gstin || '—'}</FinanceTd>
                    <FinanceTd>{row.city || '—'}</FinanceTd>
                    <FinanceTd>{row.phone || '—'}</FinanceTd>
                    <FinanceTd><StatusPill value={row.status} /></FinanceTd>
                    <FinanceTd>
                      <div className="flex gap-1">
                        <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Edit vendor" onClick={() => startEdit(row)}>
                          <Icon name="PencilSquareIcon" size={16} />
                        </button>
                        <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50" aria-label="Delete vendor" onClick={() => remove(row)}>
                          <Icon name="TrashIcon" size={16} />
                        </button>
                      </div>
                    </FinanceTd>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        {sorted.length === 0 && <EmptyRecords title="No vendors found" description="Try adjusting your filters or add a vendor." action={<AdminButton variant="primary" onClick={startCreate}>+ Add vendor</AdminButton>} />}
        <div className="px-5 pb-4">
          <Pager page={filters.applied.page} pageSize={25} total={total} onPage={filters.setPage} />
        </div>
      </section>
    </FinanceShell>
  );
}
