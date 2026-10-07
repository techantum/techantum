'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatCard from '@/components/admin/AdminStatCard';
import {
  REQUIREMENT_STATUS_LABELS,
  type Partner,
  type PartnerDashboardStats,
  type PartnerUser,
  type RequirementStatus,
} from '@/lib/partner/types';
import { partnerHasNavAccess } from '@/lib/partner/nav';

interface Activity {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface RecentRequirement {
  id: string;
  reference_id: string;
  project_name: string | null;
  status: RequirementStatus;
  budget_range: string | null;
  timeline: string | null;
  updated_at: string;
  partner_packages: { name: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  submitted: 'bg-blue-100 text-blue-800',
  under_review: 'bg-purple-100 text-purple-800',
  need_clarification: 'bg-amber-100 text-amber-800',
  proposal_sent: 'bg-orange-50 text-secondary',
  approved: 'bg-green-100 text-green-800',
  won: 'bg-emerald-100 text-emerald-800',
};

const STAT_CARDS = [
  { key: 'total', label: 'Total requirements', icon: 'ClipboardDocumentListIcon', accent: 'default' as const },
  { key: 'draft', label: 'Draft requirements', icon: 'PencilSquareIcon', accent: 'violet' as const },
  { key: 'submitted', label: 'Submitted', icon: 'PaperAirplaneIcon', accent: 'blue' as const },
  { key: 'under_review', label: 'Under review', icon: 'MagnifyingGlassIcon', accent: 'amber' as const },
  { key: 'approved', label: 'Approved / won', icon: 'CheckBadgeIcon', accent: 'green' as const },
  { key: 'converted', label: 'Converted projects', icon: 'RocketLaunchIcon', accent: 'green' as const },
] as const;

function formatAction(action: string): string {
  return action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PartnerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [partnerUser, setPartnerUser] = useState<PartnerUser | null>(null);
  const [stats, setStats] = useState<PartnerDashboardStats | null>(null);
  const [recentRequirements, setRecentRequirements] = useState<RecentRequirement[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    fetch('/api/partner/dashboard')
      .then((r) => r.json())
      .then((data) => {
        if (data.partner) {
          setPartner(data.partner);
          setPartnerUser(data.partnerUser);
          setStats(data.stats);
          setRecentRequirements(data.recentRequirements ?? []);
          setActivities(data.activities ?? []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-64 rounded bg-slate-200" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  const firstName = partnerUser?.full_name?.split(' ')[0] ?? 'Partner';
  const canCreateRequirement = partnerUser ? partnerHasNavAccess(partnerUser, 'new-requirement', partner) : false;
  const canViewRequirements = partnerUser ? partnerHasNavAccess(partnerUser, 'requirements', partner) : false;
  const canUseLeadDiscovery = partnerUser ? partnerHasNavAccess(partnerUser, 'lead-discovery', partner) : false;

  return (
    <div className="w-full space-y-8">
      <AdminPageHeader
        kicker="Partner portal"
        title={`Welcome back, ${firstName}`}
        description="Here's what's happening with your requirements and projects."
        action={
          canCreateRequirement ? (
            <Link
              href="/partner/requirements/new"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-secondary px-5 py-2.5 text-sm font-semibold text-white hover:bg-secondary/90"
            >
              <Icon name="PlusIcon" size={18} />
              New requirement
            </Link>
          ) : null
        }
      />

      {canUseLeadDiscovery ? (
        <Link
          href="/partner/lead-discovery"
          className="flex items-center justify-between gap-4 rounded-3xl border border-orange-200 bg-orange-50 px-5 py-4 hover:bg-orange-100"
        >
          <div>
            <p className="font-semibold text-slate-900">Lead discovery</p>
            <p className="mt-0.5 text-sm text-slate-600">Search Google Maps businesses and export lead lists.</p>
          </div>
          <Icon name="MagnifyingGlassCircleIcon" size={28} className="shrink-0 text-secondary" />
        </Link>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {STAT_CARDS.map((card) => (
          <AdminStatCard
            key={card.key}
            label={card.label}
            value={stats ? stats[card.key as keyof PartnerDashboardStats] : 0}
            icon={card.icon}
            accent={card.accent}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-bricolage font-semibold text-slate-900">Recent requirements</h2>
            {canViewRequirements ? (
              <Link href="/partner/requirements" className="text-xs font-semibold text-secondary hover:underline">
                View all
              </Link>
            ) : null}
          </div>
          {recentRequirements.length === 0 ? (
            <div className="p-8 text-center">
              <Icon name="ClipboardDocumentListIcon" size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="mb-4 text-sm text-slate-500">No requirements yet.</p>
              {canCreateRequirement ? (
                <Link
                  href="/partner/requirements/new"
                  className="text-sm font-medium text-secondary hover:underline"
                >
                  Create your first requirement →
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                    <th className="px-5 py-3 font-medium">Reference</th>
                    <th className="px-5 py-3 font-medium">Project</th>
                    <th className="px-5 py-3 font-medium">Package</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequirements.map((req) => (
                    <tr key={req.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-5 py-3 font-mono text-xs text-secondary">{req.reference_id}</td>
                      <td className="px-5 py-3">{req.project_name || '—'}</td>
                      <td className="px-5 py-3 text-slate-500">{req.partner_packages?.name || '—'}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            STATUS_COLORS[req.status] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {REQUIREMENT_STATUS_LABELS[req.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-400">
                        {new Date(req.updated_at).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-bricolage font-semibold text-slate-900">Recent activity</h2>
          </div>
          <div className="space-y-4 p-4">
            {activities.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">No activity yet.</p>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="flex gap-3">
                  <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-secondary" />
                  <div>
                    <p className="text-sm text-slate-700">{formatAction(act.action)}</p>
                    <p className="text-xs text-slate-400">{new Date(act.created_at).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
