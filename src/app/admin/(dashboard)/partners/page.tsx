'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import { EmptyRecords, FilterBar, FilterSearch, FilterSelect, useListFilters } from '@/components/admin/ListFilters';
import { FinanceTd, FinanceTh, Pager } from '@/components/admin/finance/FinanceUi';
import Icon from '@/components/ui/AppIcon';
import { useMasterItems } from '@/components/admin/useMasterItems';
import {
  PARTNER_STATUS_LABELS,
  PARTNER_TIER_LABELS,
  PARTNER_TYPE_LABELS,
  type Partner,
  type PartnerStatus,
  type PartnerTier,
  type PartnerType,
} from '@/lib/partner/types';

const partnerFilters = { q: '', type: '', status: '', discovery: '' };

function labelFrom(options: { value: string; label: string }[], value: string, fallback: Record<string, string>) {
  return options.find((option) => option.value === value)?.label || fallback[value] || value;
}
const PAGE_SIZE = 10;

const emptyForm = {
  company_name: '',
  contact_name: '',
  email: '',
  phone: '',
  partner_type: 'sales' as PartnerType,
  tier: 'silver' as PartnerTier,
  country: '',
  notes: '',
};

const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm';

function formatCreated(iso?: string | null) {
  if (!iso) return { day: '—', time: '' };
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { day: '—', time: '' };
  return {
    day: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  };
}

export default function PartnersAdminPage() {
  const partnerTypes = useMasterItems('partner_type', Object.entries(PARTNER_TYPE_LABELS).map(([value, label]) => ({ value, label })));
  const partnerStatuses = useMasterItems('partner_status', Object.entries(PARTNER_STATUS_LABELS).map(([value, label]) => ({ value, label })));
  const partnerTiers = useMasterItems('partner_tier', Object.entries(PARTNER_TIER_LABELS).map(([value, label]) => ({ value, label })));
  const filters = useListFilters(partnerFilters);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [viewing, setViewing] = useState<Partner | null>(null);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [sort, setSort] = useState<{ key: keyof Partner; dir: 'asc' | 'desc' }>({ key: 'created_at', dir: 'desc' });
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/partners')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPartners(data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = filters.applied.q.trim().toLowerCase();
    const rows = partners.filter((partner) => {
      const haystack = [partner.partner_code, partner.company_name, partner.contact_name, partner.email].join(' ').toLowerCase();
      if (q && !haystack.includes(q)) return false;
      if (filters.applied.type && partner.partner_type !== filters.applied.type) return false;
      if (filters.applied.status && partner.status !== filters.applied.status) return false;
      if (filters.applied.discovery === 'enabled' && !partner.lead_discovery_enabled) return false;
      if (filters.applied.discovery === 'disabled' && partner.lead_discovery_enabled) return false;
      return true;
    });
    rows.sort((a, b) => {
      const left = String(a[sort.key] || '').toLowerCase();
      const right = String(b[sort.key] || '').toLowerCase();
      return sort.dir === 'asc' ? left.localeCompare(right) : right.localeCompare(left);
    });
    return rows;
  }, [partners, filters.applied, sort]);

  const pageRows = filtered.slice((filters.applied.page - 1) * PAGE_SIZE, filters.applied.page * PAGE_SIZE);

  const toggleSort = (key: keyof Partner) => {
    setSort((current) => (current.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  const heading = (key: keyof Partner, label: string) => (
    <FinanceTh>
      <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort(key)}>
        {label}
        <Icon name="ChevronUpDownIcon" size={12} />
      </button>
    </FinanceTh>
  );

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
    setMessage('');
  };

  const startEdit = (partner: Partner) => {
    setViewing(null);
    setEditing(partner);
    setForm({
      company_name: partner.company_name,
      contact_name: partner.contact_name,
      email: partner.email,
      phone: partner.phone || '',
      partner_type: partner.partner_type,
      tier: partner.tier,
      country: partner.country || '',
      notes: partner.notes || '',
    });
    setShowForm(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(editing ? `/api/admin/partners/${editing.id}` : '/api/admin/partners', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save partner');
      setMessage(editing ? 'Partner updated.' : data.message || 'Partner created.');
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: PartnerStatus) => {
    const res = await fetch(`/api/admin/partners/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || 'Update failed');
      return;
    }
    setPartners((prev) => prev.map((partner) => (partner.id === id ? { ...partner, ...data } : partner)));
    setViewing((current) => (current?.id === id ? { ...current, ...data } : current));
    setMessage(`Partner marked ${PARTNER_STATUS_LABELS[status]}.`);
  };

  const toggleLeadDiscovery = async (partner: Partner) => {
    const enabled = !partner.lead_discovery_enabled;
    const res = await fetch(`/api/admin/partners/${partner.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_discovery_enabled: enabled }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || 'Could not update Lead Discovery access');
      return;
    }
    setPartners((prev) => prev.map((row) => (row.id === partner.id ? { ...row, ...data } : row)));
    setViewing((current) => (current?.id === partner.id ? { ...current, ...data } : current));
  };

  const resendInvite = async (id: string) => {
    const res = await fetch(`/api/admin/partners/${id}/resend-invite`, { method: 'POST' });
    const data = await res.json();
    setMessage(res.ok ? data.message : data.error || 'Resend failed');
  };

  const archivePartner = async (partner: Partner) => {
    if (!window.confirm(`Archive ${partner.company_name}? They will lose portal access.`)) return;
    await updateStatus(partner.id, 'archived');
  };

  const toggleAll = () => {
    const ids = pageRows.map((partner) => partner.id);
    const allOn = ids.every((id) => selected.includes(id));
    setSelected(allOn ? selected.filter((id) => !ids.includes(id)) : [...new Set([...selected, ...ids])]);
  };

  return (
    <div className="w-full space-y-5">
      <AdminPageHeader
        title="Partners"
        description="Create sales and marketing partners. They receive an email invite to set their password and onboard to the Partner Portal."
        action={<AdminButton variant="primary" onClick={startCreate}>+ Create Partner</AdminButton>}
      />

      {message && (
        <p className={`rounded-xl px-4 py-3 text-sm ${message.toLowerCase().includes('fail') || message.toLowerCase().includes('error') ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {message}
        </p>
      )}

      {showForm && (
        <AdminSection icon="UserPlusIcon" title={editing ? 'Edit partner' : 'New partner account'} description={editing ? 'Update the partner profile.' : 'An onboarding email with a password setup link will be sent automatically.'}>
          <form onSubmit={handleSave} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm font-medium">Company name *
              <input required value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className={`mt-1 ${inputClass}`} />
            </label>
            <label className="text-sm font-medium">Contact name *
              <input required value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className={`mt-1 ${inputClass}`} />
            </label>
            <label className="text-sm font-medium">Email *
              <input required type="email" disabled={Boolean(editing)} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`mt-1 ${inputClass} disabled:bg-slate-50`} />
            </label>
            <label className="text-sm font-medium">Phone
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={`mt-1 ${inputClass}`} />
            </label>
            <label className="text-sm font-medium">Partner type *
              <select value={form.partner_type} onChange={(e) => setForm({ ...form, partner_type: e.target.value as PartnerType })} className={`mt-1 ${inputClass}`}>
                {partnerTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">Partner tier
              <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value as PartnerTier })} className={`mt-1 ${inputClass}`}>
                {partnerTiers.map((tier) => <option key={tier.value} value={tier.value}>{tier.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">Country
              <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={`mt-1 ${inputClass}`} />
            </label>
            <label className="text-sm font-medium md:col-span-2">Internal notes
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={`mt-1 ${inputClass}`} />
            </label>
            <div className="flex gap-2 md:col-span-2">
              <AdminButton variant="primary" type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create partner & send invite'}</AdminButton>
              <AdminButton type="button" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</AdminButton>
            </div>
          </form>
        </AdminSection>
      )}

      {viewing && (
        <AdminSection icon="BuildingOffice2Icon" title={viewing.company_name} description={viewing.partner_code} action={<AdminButton onClick={() => setViewing(null)}>Close</AdminButton>}>
          <div className="grid grid-cols-1 gap-2 text-sm text-slate-600 md:grid-cols-2">
            <p><span className="font-semibold text-slate-800">Contact:</span> {viewing.contact_name}</p>
            <p><span className="font-semibold text-slate-800">Email:</span> {viewing.email}</p>
            <p><span className="font-semibold text-slate-800">Phone:</span> {viewing.phone || '—'}</p>
            <p><span className="font-semibold text-slate-800">Country:</span> {viewing.country || '—'}</p>
            <p><span className="font-semibold text-slate-800">Type:</span> {labelFrom(partnerTypes, viewing.partner_type, PARTNER_TYPE_LABELS)} · {labelFrom(partnerTiers, viewing.tier, PARTNER_TIER_LABELS)}</p>
            <p><span className="font-semibold text-slate-800">Notes:</span> {viewing.notes || '—'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {viewing.status === 'pending' && <AdminButton onClick={() => resendInvite(viewing.id)}>Resend invite</AdminButton>}
            {viewing.status === 'active' && <AdminButton onClick={() => updateStatus(viewing.id, 'suspended')}>Suspend</AdminButton>}
            {viewing.status === 'suspended' && <AdminButton onClick={() => updateStatus(viewing.id, 'active')}>Reactivate</AdminButton>}
            <AdminButton onClick={() => startEdit(viewing)}>Edit</AdminButton>
          </div>
        </AdminSection>
      )}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <FilterBar plain onSearch={filters.search} onClear={filters.clear}>
          <FilterSearch value={filters.draft.q} onChange={(value) => filters.set('q', value)} placeholder="Search by partner ID, company, contact, or email..." />
          <FilterSelect icon="BuildingOffice2Icon" value={filters.draft.type} onChange={(value) => filters.set('type', value)} className="w-44">
            <option value="">All types</option>
            {partnerTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </FilterSelect>
          <FilterSelect value={filters.draft.status} onChange={(value) => filters.set('status', value)} className="w-40">
            <option value="">All statuses</option>
            {partnerStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </FilterSelect>
          <FilterSelect icon="GlobeAltIcon" value={filters.draft.discovery} onChange={(value) => filters.set('discovery', value)} className="w-48">
            <option value="">All lead discovery</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </FilterSelect>
        </FilterBar>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bricolage font-semibold text-slate-900">All Partners</h2>
          <p className="text-xs text-slate-400">{filtered.length} partner account{filtered.length === 1 ? '' : 's'}</p>
        </div>
        {loading ? (
          <p className="px-5 py-8 text-sm text-slate-500">Loading partners…</p>
        ) : pageRows.length === 0 ? (
          <EmptyRecords title="No partners found" description="Try adjusting your filters or create a partner." action={<AdminButton variant="primary" onClick={startCreate}>+ Create Partner</AdminButton>} />
        ) : (
          <div className="overflow-x-auto px-2">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr>
                  {heading('company_name', 'Partner')}
                  {heading('partner_type', 'Type')}
                  {heading('status', 'Status')}
                  <FinanceTh>Lead discovery</FinanceTh>
                  <FinanceTh>Actions</FinanceTh>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((partner) => {
                  return (
                    <tr key={partner.id}>
                      <FinanceTd>
                        <p className="font-semibold text-slate-900">{partner.company_name}</p>
                        <p className="text-xs text-slate-400">{partner.contact_name} · {partner.partner_code}</p>
                      </FinanceTd>
                      <FinanceTd>
                        <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">{labelFrom(partnerTypes, partner.partner_type, PARTNER_TYPE_LABELS)}</span>
                      </FinanceTd>
                      <FinanceTd>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${partner.status === 'active' ? 'bg-emerald-50 text-emerald-600' : partner.status === 'suspended' ? 'bg-rose-50 text-rose-600' : partner.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                          {labelFrom(partnerStatuses, partner.status, PARTNER_STATUS_LABELS)}
                        </span>
                      </FinanceTd>
                      <FinanceTd>
                        <button type="button" onClick={() => toggleLeadDiscovery(partner)} className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${partner.lead_discovery_enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                          {partner.lead_discovery_enabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </FinanceTd>
                      <FinanceTd>
                        <div className="flex gap-1">
                          <button type="button" aria-label="View partner" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" onClick={() => setViewing(partner)}>
                            <Icon name="EyeIcon" size={16} />
                          </button>
                          <button type="button" aria-label="Edit partner" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" onClick={() => startEdit(partner)}>
                            <Icon name="PencilSquareIcon" size={16} />
                          </button>
                          <button type="button" aria-label="Archive partner" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50" onClick={() => archivePartner(partner)}>
                            <Icon name="TrashIcon" size={16} />
                          </button>
                        </div>
                      </FinanceTd>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-5 pb-4">
          <Pager page={filters.applied.page} pageSize={PAGE_SIZE} total={filtered.length} onPage={filters.setPage} />
        </div>
      </section>
    </div>
  );
}
