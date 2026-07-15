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

const SOURCE_LABELS: Record<string, string> = {
  homepage_hero: 'Homepage hero',
  contact_page: 'Contact page',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then(setStats)
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
        <AdminStatCard label="Website pages" value={stats.pages} hint={`${stats.publicRoutes} public URLs`} />
        <AdminStatCard label="Content sections" value={stats.contentSections} hint="Editable in Site Content" />
        <AdminStatCard
          label="Total leads"
          value={stats.totalLeads}
          hint="All form submissions"
        />
        <AdminStatCard
          label="Page views"
          value={stats.analytics.configured ? 'GA active' : '—'}
          hint={stats.analytics.note}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <AdminStatCard label="Pending" value={stats.pendingLeads} accent="amber" hint="Needs follow-up" />
        <AdminStatCard label="Contacted" value={stats.contactedLeads} accent="blue" hint="In progress" />
        <AdminStatCard label="Closed" value={stats.closedLeads} accent="green" hint="Converted / resolved" />
        <AdminStatCard label="Indexed pages" value={stats.indexedPages} hint={`${stats.activeRedirects} active redirects`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Recent leads</h2>
            <Link href="/admin/submissions" className="text-sm text-primary hover:underline">
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

        <div className="bg-white rounded-xl border border-border p-5 space-y-3">
          <h2 className="font-semibold text-foreground">Quick links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { href: '/admin/content', label: 'Edit site content' },
              { href: '/admin/submissions', label: 'Manage leads' },
              { href: '/admin/branding', label: 'Update branding' },
              { href: '/admin/seo', label: 'Global SEO' },
              { href: '/admin/page-seo', label: 'Page indexing' },
              { href: '/admin/redirects', label: 'URL redirects' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
              >
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
