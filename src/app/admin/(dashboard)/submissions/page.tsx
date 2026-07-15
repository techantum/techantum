'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatCard from '@/components/admin/AdminStatCard';

interface Submission {
  id: string;
  name: string;
  country: string;
  email: string;
  phone: string;
  product_category: string;
  quantity: string;
  message: string | null;
  source: string | null;
  status: string;
  created_at: string;
}

const SOURCE_LABELS: Record<string, string> = {
  homepage_hero: 'Homepage hero',
  contact_page: 'Contact page',
};

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', className: 'bg-amber-100 text-amber-800' },
  { value: 'contacted', label: 'Contacted', className: 'bg-blue-100 text-blue-800' },
  { value: 'closed', label: 'Closed', className: 'bg-green-100 text-green-800' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function SubmissionsAdminPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selected, setSelected] = useState<Submission | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (sourceFilter !== 'all') params.set('source', sourceFilter);
    fetch(`/api/admin/submissions?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSubmissions(data);
      })
      .finally(() => setLoading(false));
  }, [statusFilter, sourceFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = {
    pending: submissions.filter((s) => s.status === 'pending').length,
    contacted: submissions.filter((s) => s.status === 'contacted').length,
    closed: submissions.filter((s) => s.status === 'closed').length,
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
      if (selected?.id === id) setSelected({ ...selected, ...data });
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <AdminPageHeader
        title="Leads"
        description="Contact form and homepage hero submissions. Update status to track follow-ups and conversions."
      />

      <div className="grid grid-cols-3 gap-3">
        <AdminStatCard label="Pending" value={counts.pending} accent="amber" hint="Needs follow-up" />
        <AdminStatCard label="Contacted" value={counts.contacted} accent="blue" hint="In conversation" />
        <AdminStatCard label="Closed" value={counts.closed} accent="green" hint="Converted / done" />
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-sm bg-white"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="contacted">Contacted</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-sm bg-white"
        >
          <option value="all">All sources</option>
          <option value="homepage_hero">Homepage hero</option>
          <option value="contact_page">Contact page</option>
        </select>
        <button
          type="button"
          onClick={load}
          className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted bg-white"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading leads…</p>
      ) : submissions.length === 0 ? (
        <p className="text-muted-foreground bg-white rounded-xl border border-border p-8 text-center">
          No leads match your filters.
        </p>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((row) => {
                  const statusMeta = STATUS_OPTIONS.find((s) => s.value === row.status);
                  return (
                    <tr key={row.id} className="border-b border-border hover:bg-muted/20">
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="px-4 py-3 font-medium">{row.name}</td>
                      <td className="px-4 py-3">
                        <a href={`tel:${row.phone}`} className="text-primary hover:underline">
                          {row.phone}
                        </a>
                      </td>
                      <td className="px-4 py-3 max-w-[180px] truncate">{row.product_category}</td>
                      <td className="px-4 py-3">
                        {SOURCE_LABELS[row.source || 'contact_page'] || row.source || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusMeta?.className || 'bg-muted'}`}
                        >
                          {statusMeta?.label || row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSelected(row)}
                          className="text-primary text-sm font-medium hover:underline"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl border border-border max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-white">
              <h2 className="font-semibold text-lg">Lead details</h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="h-8 w-8 rounded-lg border border-border text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-4 space-y-3 text-sm">
              <DetailRow label="Name" value={selected.name} />
              <DetailRow label="Phone" value={selected.phone} href={`tel:${selected.phone}`} />
              {selected.email && selected.email !== '—' && (
                <DetailRow label="Email" value={selected.email} href={`mailto:${selected.email}`} />
              )}
              {selected.country && selected.country !== '—' && (
                <DetailRow label="Country" value={selected.country} />
              )}
              <DetailRow label="Service interest" value={selected.product_category} />
              {selected.quantity && selected.quantity !== '—' && (
                <DetailRow label="Timeline / budget" value={selected.quantity} />
              )}
              {selected.message && <DetailRow label="Message" value={selected.message} />}
              <DetailRow
                label="Source"
                value={SOURCE_LABELS[selected.source || 'contact_page'] || selected.source || '—'}
              />
              <DetailRow label="Submitted" value={formatDate(selected.created_at)} />
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
                <select
                  value={selected.status}
                  disabled={updating}
                  onChange={(e) => updateStatus(selected.id, e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-0.5">{label}</p>
      {href ? (
        <a href={href} className="text-primary hover:underline break-all">
          {value}
        </a>
      ) : (
        <p className="text-foreground break-words">{value}</p>
      )}
    </div>
  );
}
