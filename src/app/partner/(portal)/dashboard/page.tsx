'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import {
  REQUIREMENT_STATUS_LABELS,
  type Partner,
  type PartnerDashboardStats,
  type PartnerUser,
  type RequirementStatus,
} from '@/lib/partner/types';

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
  proposal_sent: 'bg-indigo-100 text-indigo-800',
  approved: 'bg-green-100 text-green-800',
  won: 'bg-emerald-100 text-emerald-800',
};

const STAT_CARDS = [
  { key: 'total', label: 'Total Requirements', icon: 'ClipboardDocumentListIcon', color: 'text-indigo-600' },
  { key: 'draft', label: 'Draft Requirements', icon: 'PencilSquareIcon', color: 'text-slate-600' },
  { key: 'submitted', label: 'Submitted', icon: 'PaperAirplaneIcon', color: 'text-blue-600' },
  { key: 'under_review', label: 'Under Review', icon: 'MagnifyingGlassIcon', color: 'text-purple-600' },
  { key: 'approved', label: 'Approved / Won', icon: 'CheckBadgeIcon', color: 'text-green-600' },
  { key: 'converted', label: 'Converted Projects', icon: 'RocketLaunchIcon', color: 'text-emerald-600' },
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
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const firstName = partnerUser?.full_name?.split(' ')[0] ?? 'Partner';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-bricolage text-2xl font-bold text-slate-900">
            Welcome back, {firstName}!
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Here&apos;s what&apos;s happening with your requirements and projects.
          </p>
        </div>
        <Link
          href="/partner/requirements/new"
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <Icon name="PlusIcon" size={18} />
          New Requirement
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {STAT_CARDS.map((card) => (
          <div
            key={card.key}
            className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon name={card.icon as any} size={18} className={card.color} />
              <span className="text-xs text-slate-500 font-medium">{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {stats ? stats[card.key as keyof PartnerDashboardStats] : 0}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent requirements */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Recent Requirements</h2>
            <Link href="/partner/requirements" className="text-xs text-indigo-600 hover:underline">
              View All
            </Link>
          </div>
          {recentRequirements.length === 0 ? (
            <div className="p-8 text-center">
              <Icon name="ClipboardDocumentListIcon" size={40} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 mb-4">No requirements yet.</p>
              <Link
                href="/partner/requirements/new"
                className="text-sm text-indigo-600 hover:underline font-medium"
              >
                Create your first requirement →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
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
                      <td className="px-5 py-3 font-mono text-xs text-indigo-600">
                        {req.reference_id}
                      </td>
                      <td className="px-5 py-3">{req.project_name || '—'}</td>
                      <td className="px-5 py-3 text-slate-500">
                        {req.partner_packages?.name || '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
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

        {/* Recent activity */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Recent Activity</h2>
          </div>
          <div className="p-4 space-y-4">
            {activities.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No activity yet.</p>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 mt-2 shrink-0" />
                  <div>
                    <p className="text-sm text-slate-700">{formatAction(act.action)}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(act.created_at).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Partner info footer */}
      {partner && (
        <div className="bg-indigo-50 rounded-xl p-4 flex flex-wrap items-center gap-4 text-sm">
          <span className="font-mono font-semibold text-indigo-800">{partner.partner_code}</span>
          <span className="text-indigo-600">{partner.company_name}</span>
          {partner.joined_at && (
            <span className="text-indigo-500 text-xs">
              Joined {new Date(partner.joined_at).toLocaleDateString('en-IN')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
