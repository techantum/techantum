'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatCard from '@/components/admin/AdminStatCard';

interface RecentLead {
  id: string;
  name: string;
  product_category: string;
  source: string | null;
  status: string;
  created_at: string;
}

interface DashboardStats {
  pages: number;
  publicRoutes: number;
  contentSections: number;
  totalLeads: number;
  pendingLeads: number;
  contactedLeads: number;
  closedLeads: number;
  activeRedirects: number;
  indexedPages: number;
  recentLeads: RecentLead[];
  analytics: { configured: boolean; note: string };
}

interface AnalyticsSummaryResponse {
  configured: boolean;
  error?: string;
  summary: { activeUsers: number; pageViews: number } | null;
}

const SOURCE_LABELS: Record<string, string> = {
  homepage_hero: 'Homepage hero',
  contact_page: 'Contact page',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/stats').then((r) => r.json()),
      fetch('/api/admin/analytics?range=7d').then((r) => r.json()),
    ])
      .then(([statsData, analyticsData]) => {
        setStats(statsData);
        setAnalytics(analyticsData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted-foreground">Loading dashboard…</p>;
  if (!stats) return <p className="text-muted-foreground">Unable to load dashboard stats.</p>;

  return (
    <div className="space-y-8 max-w-6xl">
      <AdminPageHeader
        title="Overview"
        description="Key metrics for your website, leads, and SEO at a glance."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <AdminStatCard label="Website pages" value={stats.pages} hint={`${stats.publicRoutes} public URLs`} icon="DocumentTextIcon" accent="violet" />
        <AdminStatCard label="Content sections" value={stats.contentSections} hint="Editable in Site Content" icon="PencilSquareIcon" accent="blue" />
        <AdminStatCard label="Total leads" value={stats.totalLeads} hint="All form submissions" icon="InboxIcon" accent="default" />
        <AdminStatCard
          label="Visitors (7d)"
          value={
            analytics?.summary
              ? analytics.summary.activeUsers.toLocaleString('en-IN')
              : stats.analytics.configured
                ? '—'
                : '—'
          }
          hint={
            analytics?.summary
              ? `${analytics.summary.pageViews.toLocaleString('en-IN')} page views`
              : analytics?.error
                ? 'Set up GA4 API credentials'
                : stats.analytics.note
          }
          icon="ChartBarIcon"
          accent="green"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <AdminStatCard label="Pending" value={stats.pendingLeads} accent="amber" hint="Needs follow-up" icon="ClockIcon" />
        <AdminStatCard label="Contacted" value={stats.contactedLeads} accent="blue" hint="In progress" icon="ChatBubbleLeftRightIcon" />
        <AdminStatCard label="Closed" value={stats.closedLeads} accent="green" hint="Converted / resolved" icon="CheckCircleIcon" />
        <AdminStatCard label="Indexed pages" value={stats.indexedPages} hint={`${stats.activeRedirects} active redirects`} icon="GlobeAltIcon" accent="violet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white/90 backdrop-blur rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-indigo-500/10 to-violet-500/5 flex items-center justify-between">
            <h2 className="font-bricolage font-semibold text-foreground">Recent leads</h2>
            <Link href="/admin/submissions" className="text-sm text-indigo-600 hover:underline font-medium">
              View all
            </Link>
          </div>
          {stats.recentLeads.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground text-center">No leads yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {stats.recentLeads.map((lead) => (
                <li key={lead.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{lead.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {lead.product_category} · {SOURCE_LABELS[lead.source || ''] || lead.source || 'Contact'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs capitalize text-muted-foreground">{lead.status}</span>
                    <p className="text-xs text-muted-foreground">{formatDate(lead.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white/90 backdrop-blur rounded-2xl border border-border shadow-sm p-5 space-y-4">
          <h2 className="font-bricolage font-semibold text-foreground">Quick links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {[
              { href: '/admin/analytics', label: 'Website analytics', icon: 'ChartBarIcon' },
              { href: '/admin/content', label: 'Edit site content', icon: 'PencilSquareIcon' },
              { href: '/admin/submissions', label: 'Manage leads', icon: 'InboxIcon' },
              { href: '/admin/branding', label: 'Update branding', icon: 'PaintBrushIcon' },
              { href: '/admin/seo', label: 'Global SEO', icon: 'MagnifyingGlassIcon' },
              { href: '/admin/page-seo', label: 'Page indexing', icon: 'DocumentCheckIcon' },
              { href: '/admin/partner-catalog', label: 'Wizard questions', icon: 'ClipboardDocumentListIcon' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border text-sm font-medium hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all"
              >
                <span className="text-indigo-500">→</span>
                {link.label}
              </Link>
            ))}
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            Marketing pages use static generation (SSG) with 5-minute revalidation for fast performance.
          </p>
        </div>
      </div>
    </div>
  );
}
