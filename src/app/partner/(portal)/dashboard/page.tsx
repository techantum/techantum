'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import {
  REQUIREMENT_STATUS_LABELS,
  type PartnerDashboardStats,
  type RequirementStatus,
} from '@/lib/partner/types';
import { partnerHasNavAccess } from '@/lib/partner/nav';
import { usePartnerAccess } from '@/components/partner/PartnerShell';

interface Activity {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
  actor_name?: string | null;
}

interface RecentRequirement {
  id: string;
  reference_id: string;
  project_name: string | null;
  status: RequirementStatus;
  updated_at: string;
  partner_packages: { name: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  submitted: 'bg-blue-50 text-blue-700',
  under_review: 'bg-violet-50 text-violet-700',
  need_clarification: 'bg-amber-100 text-amber-800',
  proposal_sent: 'bg-orange-50 text-secondary',
  approved: 'bg-emerald-50 text-emerald-700',
  won: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-50 text-red-700',
  lost: 'bg-red-50 text-red-700',
};

const STAT_CARDS = [
  { key: 'total', label: 'Total Requirements', icon: 'DocumentTextIcon', href: '/partner/requirements', card: 'bg-sky-50', iconWrap: 'text-sky-600' },
  { key: 'draft', label: 'Draft Requirements', icon: 'PencilSquareIcon', href: '/partner/requirements', card: 'bg-rose-50', iconWrap: 'text-rose-500' },
  { key: 'submitted', label: 'Submitted', icon: 'PaperAirplaneIcon', href: '/partner/requirements', card: 'bg-blue-50', iconWrap: 'text-blue-600' },
  { key: 'under_review', label: 'Under Review', icon: 'ClockIcon', href: '/partner/requirements', card: 'bg-amber-50', iconWrap: 'text-amber-600' },
  { key: 'approved', label: 'Approved / Won', icon: 'CheckCircleIcon', href: '/partner/requirements', card: 'bg-emerald-50', iconWrap: 'text-emerald-600' },
  { key: 'converted', label: 'Converted Projects', icon: 'RocketLaunchIcon', href: '/partner/requirements', card: 'bg-teal-50', iconWrap: 'text-teal-600' },
] as const;

function greetingForHour(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatAction(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function activityIcon(action: string): string {
  if (action.includes('dashboard')) return 'ComputerDesktopIcon';
  if (action.includes('team') || action.includes('invite')) return 'UserPlusIcon';
  if (action.includes('onboard') || action.includes('partner')) return 'UserGroupIcon';
  if (action.includes('clarification') || action.includes('chat')) return 'ChatBubbleLeftRightIcon';
  if (action.includes('requirement')) return 'ClipboardDocumentListIcon';
  return 'SparklesIcon';
}

function formatUpdated(value: string): { date: string; time: string } {
  const date = new Date(value);
  return {
    date: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  };
}

export default function PartnerDashboardPage() {
  const access = usePartnerAccess();
  const partner = access?.partner ?? null;
  const partnerUser = access?.partnerUser ?? null;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PartnerDashboardStats | null>(null);
  const [recentRequirements, setRecentRequirements] = useState<RecentRequirement[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [menuId, setMenuId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/partner/dashboard')
      .then((r) => r.json())
      .then((data) => {
        if (data.stats) setStats(data.stats);
        setRecentRequirements(data.recentRequirements ?? []);
        setActivities(data.activities ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const duplicate = async (id: string) => {
    const res = await fetch('/api/partner/requirements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'duplicate', sourceId: id }),
    });
    const data = await res.json();
    if (data.id) window.location.href = `/partner/requirements/new?draft=${data.id}`;
  };

  const firstName = partnerUser?.full_name?.split(' ')[0] ?? 'Partner';
  const canCreateRequirement = partnerUser ? partnerHasNavAccess(partnerUser, 'requirements', partner) : false;
  const canViewRequirements = partnerUser ? partnerHasNavAccess(partnerUser, 'requirements', partner) : false;
  const canManageTeam = partnerUser?.role === 'partner_admin' || (partnerUser ? partnerHasNavAccess(partnerUser, 'team', partner) : false);
  const canViewDocuments = partnerUser ? partnerHasNavAccess(partnerUser, 'documents', partner) : false;
  const canUseYoutube = partnerUser ? partnerHasNavAccess(partnerUser, 'youtube-research', partner) : false;

  return (
    <div className="w-full space-y-5">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-orange-50 via-amber-50 to-rose-50 px-6 py-7 sm:px-8">
        <div className="pointer-events-none absolute -right-16 top-0 h-48 w-64 rounded-full bg-white/50 blur-2xl" />
        <div className="pointer-events-none absolute right-24 -bottom-16 h-40 w-40 rounded-full bg-orange-100/80 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">{greetingForHour()},</p>
            <h1 className="font-bricolage text-4xl font-bold tracking-tight text-slate-900">{firstName}</h1>
            <p className="mt-2 text-sm text-slate-500">Here&apos;s what&apos;s happening with your requirements and projects.</p>
          </div>
          {canCreateRequirement ? (
            <Link
              href="/partner/requirements/new"
              className="inline-flex items-center gap-2 self-start rounded-full bg-secondary px-5 py-2.5 text-sm font-semibold text-white hover:bg-secondary/90"
            >
              <Icon name="PlusIcon" size={16} />
              Create new requirement
            </Link>
          ) : null}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {STAT_CARDS.map((card) => (
          <Link
            key={card.key}
            href={canViewRequirements ? card.href : '/partner/dashboard'}
            className={`flex items-center gap-3 rounded-2xl ${card.card} px-4 py-3.5 transition hover:brightness-[0.98]`}
          >
            <Icon name={card.icon} size={22} className={card.iconWrap} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-slate-500">{card.label}</p>
              <p className="font-bricolage text-2xl font-bold leading-none text-slate-900">{stats ? stats[card.key] : 0}</p>
            </div>
            <Icon name="ChevronRightIcon" size={16} className="text-slate-300" />
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white xl:col-span-2">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="font-semibold text-slate-900">Recent requirements</h2>
            {canViewRequirements ? (
              <Link href="/partner/requirements" className="text-xs font-semibold text-secondary hover:underline">
                View all →
              </Link>
            ) : null}
          </div>
          {loading ? (
            <div className="space-y-2 px-5 pb-5">
              {[1, 2, 3].map((row) => (
                <div key={row} className="h-12 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : recentRequirements.length === 0 ? (
            <div className="px-5 pb-8 text-center text-sm text-slate-500">No requirements yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400">
                    <th className="px-5 py-2 font-medium">Reference</th>
                    <th className="px-5 py-2 font-medium">Project</th>
                    <th className="px-5 py-2 font-medium">Package</th>
                    <th className="px-5 py-2 font-medium">Status</th>
                    <th className="px-5 py-2 font-medium">Updated</th>
                    <th className="px-5 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequirements.map((req) => {
                    const updated = formatUpdated(req.updated_at);
                    return (
                      <tr key={req.id} className="border-t border-slate-50 hover:bg-slate-50/60">
                        <td className="px-5 py-3">
                          <Link href={`/partner/requirements/${req.id}`} className="font-mono text-xs font-semibold text-secondary hover:underline">
                            {req.reference_id}
                          </Link>
                        </td>
                        <td className="px-5 py-3 font-medium text-slate-800">{req.project_name || '—'}</td>
                        <td className="px-5 py-3 text-slate-500">{req.partner_packages?.name || '—'}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[req.status] ?? 'bg-slate-100 text-slate-600'}`}>
                            {REQUIREMENT_STATUS_LABELS[req.status]}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs leading-5 text-slate-500">
                          <span className="block">{updated.date}</span>
                          <span className="text-slate-400">{updated.time}</span>
                        </td>
                        <td className="relative px-5 py-3">
                          <div className="flex items-center gap-2">
                            <Link href={`/partner/requirements/${req.id}`} className="text-xs font-semibold text-secondary hover:underline">
                              View
                            </Link>
                            {canCreateRequirement ? (
                              <button
                                type="button"
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                                onClick={() => setMenuId((current) => (current === req.id ? null : req.id))}
                                aria-label="More actions"
                              >
                                <Icon name="EllipsisHorizontalIcon" size={16} />
                              </button>
                            ) : null}
                          </div>
                          {menuId === req.id ? (
                            <div className="absolute right-4 z-10 mt-1 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                              {req.status === 'draft' ? (
                                <Link href={`/partner/requirements/new?draft=${req.id}`} className="block px-3 py-2 text-xs text-slate-700 hover:bg-slate-50" onClick={() => setMenuId(null)}>
                                  Continue editing
                                </Link>
                              ) : null}
                              <button type="button" className="block w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50" onClick={() => duplicate(req.id)}>
                                Duplicate
                              </button>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="font-semibold text-slate-900">Recent activity</h2>
              <Link href="/partner/notifications" className="text-xs font-semibold text-secondary hover:underline">
                View all →
              </Link>
            </div>
            <div className="space-y-3 px-5 pb-5">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((row) => (
                    <div key={row} className="h-10 animate-pulse rounded-xl bg-slate-100" />
                  ))}
                </div>
              ) : activities.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">No activity yet.</p>
              ) : (
                activities.slice(0, 6).map((act) => (
                  <div key={act.id} className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <Icon name={activityIcon(act.action)} size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{formatAction(act.action)}</p>
                      <p className="text-xs text-slate-400">
                        {formatUpdated(act.created_at).date}, {formatUpdated(act.created_at).time}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 font-semibold text-slate-900">Quick actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {canCreateRequirement ? (
                <Link href="/partner/requirements/new" className="flex items-center gap-2 rounded-2xl bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-100">
                  <Icon name="PlusIcon" size={16} />
                  Create requirement
                </Link>
              ) : null}
              {canManageTeam ? (
                <Link href="/partner/team" className="flex items-center gap-2 rounded-2xl bg-sky-50 px-3 py-3 text-sm font-semibold text-sky-600 hover:bg-sky-100">
                  <Icon name="UserPlusIcon" size={16} />
                  Invite member
                </Link>
              ) : null}
              {canViewDocuments ? (
                <Link href="/partner/documents" className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100">
                  <Icon name="FolderOpenIcon" size={16} />
                  Browse documents
                </Link>
              ) : null}
              {canUseYoutube ? (
                <Link href="/partner/youtube-research" className="flex items-center gap-2 rounded-2xl bg-violet-50 px-3 py-3 text-sm font-semibold text-violet-700 hover:bg-violet-100">
                  <Icon name="PlayCircleIcon" size={16} />
                  Open Youtube Research
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
