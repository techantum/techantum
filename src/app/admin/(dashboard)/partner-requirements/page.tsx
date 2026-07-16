'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import { REQUIREMENT_STATUS_LABELS, type RequirementStatus } from '@/lib/partner/types';

interface RequirementRow {
  id: string;
  reference_id: string;
  project_name: string | null;
  status: string;
  industry: string | null;
  country: string | null;
  budget_range: string | null;
  updated_at: string;
  partners?: { company_name: string; contact_name: string; partner_code: string };
  partner_packages?: { name: string } | null;
  partner_service_categories?: { name: string } | null;
}

interface Analytics {
  total: number;
  byStatus: Record<string, number>;
  topPackages: [string, number][];
  topIndustries: [string, number][];
  topModules: [string, number][];
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  submitted: 'bg-blue-100 text-blue-800',
  under_review: 'bg-purple-100 text-purple-800',
  approved: 'bg-green-100 text-green-800',
  won: 'bg-emerald-100 text-emerald-800',
};

export default function AdminPartnerRequirementsPage() {
  const [requirements, setRequirements] = useState<RequirementRow[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (search) params.set('search', search);

    Promise.all([
      fetch(`/api/admin/partner-requirements?${params}`).then((r) => r.json()),
      fetch('/api/admin/partner-requirements?analytics=true').then((r) => r.json()),
    ])
      .then(([reqs, stats]) => {
        if (Array.isArray(reqs)) setRequirements(reqs);
        setAnalytics(stats);
      })
      .finally(() => setLoading(false));
  }, [statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/admin/partner-requirements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <AdminPageHeader
        title="Partner Requirements"
        description="All client requirements submitted through the Partner Portal with generated SOW documents."
      />

      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{analytics.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Submitted</p>
            <p className="text-2xl font-bold">{analytics.byStatus.submitted ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Under Review</p>
            <p className="text-2xl font-bold">{analytics.byStatus.under_review ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Won</p>
            <p className="text-2xl font-bold">{analytics.byStatus.won ?? 0}</p>
          </div>
        </div>
      )}

      {analytics && analytics.topPackages.length > 0 && (
        <AdminSection title="Analytics" description="Popular packages and modules">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium mb-2">Top Packages</p>
              {analytics.topPackages.map(([name, count]) => (
                <p key={name} className="text-muted-foreground">{name}: {count}</p>
              ))}
            </div>
            <div>
              <p className="font-medium mb-2">Top Industries</p>
              {analytics.topIndustries.map(([name, count]) => (
                <p key={name} className="text-muted-foreground">{name}: {count}</p>
              ))}
            </div>
            <div>
              <p className="font-medium mb-2">Popular Modules</p>
              {analytics.topModules.map(([name, count]) => (
                <p key={name} className="text-muted-foreground">{name}: {count}</p>
              ))}
            </div>
          </div>
        </AdminSection>
      )}

      <AdminSection title="All Requirements">
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="search"
            placeholder="Search reference or project…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border text-sm w-64"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border text-sm"
          >
            <option value="all">All statuses</option>
            {Object.entries(REQUIREMENT_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : requirements.length === 0 ? (
          <p className="text-muted-foreground text-sm">No requirements yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Reference</th>
                  <th className="pb-3 pr-4 font-medium">Project</th>
                  <th className="pb-3 pr-4 font-medium">Partner</th>
                  <th className="pb-3 pr-4 font-medium">Service</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requirements.map((req) => (
                  <tr key={req.id} className="border-b border-border/60">
                    <td className="py-3 pr-4 font-mono text-xs">{req.reference_id}</td>
                    <td className="py-3 pr-4">{req.project_name || '—'}</td>
                    <td className="py-3 pr-4">
                      <p className="font-medium">{req.partners?.company_name}</p>
                      <p className="text-xs text-muted-foreground">{req.partners?.partner_code}</p>
                    </td>
                    <td className="py-3 pr-4 text-xs">
                      {req.partner_service_categories?.name}<br />
                      {req.partner_packages?.name}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[req.status] ?? 'bg-slate-100'}`}>
                        {REQUIREMENT_STATUS_LABELS[req.status as RequirementStatus] ?? req.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/partner-requirements/${req.id}`}
                          className="text-xs text-primary hover:underline"
                        >
                          View
                        </Link>
                        <select
                          value={req.status}
                          onChange={(e) => updateStatus(req.id, e.target.value)}
                          className="text-xs border border-border rounded px-2 py-1"
                        >
                          {Object.entries(REQUIREMENT_STATUS_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
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
