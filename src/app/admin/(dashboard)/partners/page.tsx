'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import {
  PARTNER_STATUS_LABELS,
  PARTNER_TIER_LABELS,
  PARTNER_TYPE_LABELS,
  type Partner,
  type PartnerStatus,
  type PartnerTier,
  type PartnerType,
} from '@/lib/partner/types';

const STATUS_STYLES: Record<PartnerStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-red-100 text-red-800',
  archived: 'bg-slate-100 text-slate-600',
};

export default function PartnersAdminPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    partner_type: 'sales' as PartnerType,
    tier: 'silver' as PartnerTier,
    country: '',
    notes: '',
  });

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create partner');

      setMessage(data.message || 'Partner created.');
      setShowForm(false);
      setForm({
        company_name: '',
        contact_name: '',
        email: '',
        phone: '',
        partner_type: 'sales',
        tier: 'silver',
        country: '',
        notes: '',
      });
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Create failed');
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
    setPartners((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
    setMessage(`Partner ${status === 'suspended' ? 'suspended' : 'updated'}.`);
  };

  const resendInvite = async (id: string) => {
    const res = await fetch(`/api/admin/partners/${id}/resend-invite`, { method: 'POST' });
    const data = await res.json();
    setMessage(res.ok ? data.message : data.error || 'Resend failed');
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <AdminPageHeader
        title="Partners"
        description="Create sales and marketing partners. They receive an email invite to set their password and onboard to the Partner Portal."
        action={
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90"
          >
            {showForm ? 'Cancel' : '+ Create Partner'}
          </button>
        }
      />

      {message && (
        <p
          className={`text-sm px-4 py-3 rounded-lg ${
            message.toLowerCase().includes('fail') || message.toLowerCase().includes('error')
              ? 'bg-red-50 text-red-700'
              : 'bg-green-50 text-green-700'
          }`}
        >
          {message}
        </p>
      )}

      {showForm && (
        <AdminSection
          title="New Partner Account"
          description="An onboarding email with a password setup link will be sent automatically."
        >
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Company Name *</label>
              <input
                required
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                placeholder="Agency or company name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact Name *</label>
              <input
                required
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                placeholder="Primary contact person"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                placeholder="partner@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Partner Type *</label>
              <select
                value={form.partner_type}
                onChange={(e) => setForm({ ...form, partner_type: e.target.value as PartnerType })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              >
                {Object.entries(PARTNER_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Partner Tier</label>
              <select
                value={form.tier}
                onChange={(e) => setForm({ ...form, tier: e.target.value as PartnerTier })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              >
                {Object.entries(PARTNER_TIER_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Country</label>
              <input
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Internal Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? 'Creating & Sending Invite…' : 'Create Partner & Send Invite'}
              </button>
            </div>
          </form>
        </AdminSection>
      )}

      <AdminSection title="All Partners" description={`${partners.length} partner account(s)`}>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading partners…</p>
        ) : partners.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No partners yet. Create your first sales or marketing partner above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Partner ID</th>
                  <th className="pb-3 pr-4 font-medium">Company</th>
                  <th className="pb-3 pr-4 font-medium">Contact</th>
                  <th className="pb-3 pr-4 font-medium">Type</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p.id} className="border-b border-border/60">
                    <td className="py-3 pr-4 font-mono text-xs">{p.partner_code}</td>
                    <td className="py-3 pr-4">
                      <p className="font-medium">{p.company_name}</p>
                      <p className="text-xs text-muted-foreground">{p.email}</p>
                    </td>
                    <td className="py-3 pr-4">{p.contact_name}</td>
                    <td className="py-3 pr-4 text-xs">
                      {PARTNER_TYPE_LABELS[p.partner_type]}
                      <br />
                      <span className="text-muted-foreground">{PARTNER_TIER_LABELS[p.tier]}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[p.status]}`}
                      >
                        {PARTNER_STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        {p.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => resendInvite(p.id)}
                            className="text-xs text-indigo-600 hover:underline"
                          >
                            Resend Invite
                          </button>
                        )}
                        {p.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => updateStatus(p.id, 'suspended')}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Suspend
                          </button>
                        )}
                        {p.status === 'suspended' && (
                          <button
                            type="button"
                            onClick={() => updateStatus(p.id, 'active')}
                            className="text-xs text-green-600 hover:underline"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>
    </div>
  );
}
