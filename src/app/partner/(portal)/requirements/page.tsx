'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import { REQUIREMENT_STATUS_LABELS, type RequirementRecord, type RequirementStatus } from '@/lib/partner/types';
import { usePartnerAccess } from '@/components/partner/PartnerShell';
import { partnerHasNavAccess } from '@/lib/partner/nav';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  submitted: 'bg-blue-100 text-blue-800',
  under_review: 'bg-purple-100 text-purple-800',
  need_clarification: 'bg-amber-100 text-amber-800',
  proposal_sent: 'bg-orange-50 text-secondary',
  approved: 'bg-green-100 text-green-800',
  won: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  lost: 'bg-red-100 text-red-800',
};

export default function PartnerRequirementsPage() {
  const access = usePartnerAccess();
  const canCreateRequirement = access
    ? partnerHasNavAccess(access.partnerUser, 'new-requirement', access.partner)
    : false;
  const [requirements, setRequirements] = useState<RequirementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/partner/requirements')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRequirements(data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all'
    ? requirements
    : requirements.filter((r) => r.status === filter);

  const duplicate = async (id: string) => {
    const res = await fetch('/api/partner/requirements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'duplicate', sourceId: id }),
    });
    const data = await res.json();
    if (data.id) {
      window.location.href = `/partner/requirements/new?draft=${data.id}`;
    }
  };

  return (
    <div className="w-full space-y-6">
      <AdminPageHeader
        kicker="Partner portal"
        title="My requirements"
        description={`${requirements.length} total submissions`}
        action={
          canCreateRequirement ? (
            <Link
              href="/partner/requirements/new"
              className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold text-white hover:bg-secondary/90"
            >
              <Icon name="PlusIcon" size={16} />
              New requirement
            </Link>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {['all', 'draft', 'submitted', 'under_review', 'approved', 'won'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === s ? 'bg-secondary text-white' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {s === 'all' ? 'All' : REQUIREMENT_STATUS_LABELS[s as RequirementStatus]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <p className="text-slate-600 mb-4">No requirements found.</p>
          <Link href="/partner/requirements/new" className="text-secondary hover:underline text-sm font-medium">
            Create your first requirement →
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                <th className="px-5 py-3 font-medium">Reference</th>
                <th className="px-5 py-3 font-medium">Project</th>
                <th className="px-5 py-3 font-medium">Service</th>
                <th className="px-5 py-3 font-medium">Package</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Budget</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((req) => (
                <tr key={req.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-5 py-3 font-mono text-xs text-secondary">
                    <Link href={`/partner/requirements/${req.id}`} className="hover:underline">
                      {req.reference_id}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{req.project_name || '—'}</td>
                  <td className="px-5 py-3 text-slate-500">{req.partner_service_categories?.name ?? '—'}</td>
                  <td className="px-5 py-3 text-slate-500">{req.partner_packages?.name ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[req.status] ?? ''}`}>
                      {REQUIREMENT_STATUS_LABELS[req.status as RequirementStatus]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{req.budget_range ?? '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <Link href={`/partner/requirements/${req.id}`} className="text-secondary hover:underline text-xs">
                        View
                      </Link>
                      {canCreateRequirement && req.status === 'draft' && (
                        <Link href={`/partner/requirements/new?draft=${req.id}`} className="text-slate-500 hover:underline text-xs">
                          Edit
                        </Link>
                      )}
                      {canCreateRequirement ? (
                        <button type="button" onClick={() => duplicate(req.id)} className="text-slate-500 hover:underline text-xs">
                          Duplicate
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
