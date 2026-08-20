'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminStatCard from '@/components/admin/AdminStatCard';
import AdminButton from '@/components/admin/AdminButton';
import AdminBadge from '@/components/admin/AdminBadge';
import { OpsPageShell, OpsTd, OpsTh } from '@/components/admin/ops/OpsUi';
import { PROJECT_STATUS_LABELS, TICKET_STATUS_LABELS } from '@/lib/ops/config';

interface DashboardData {
  activeProjects: number;
  openTickets: number;
  bugs: number;
  features: number;
  enhancements: number;
  projectsDueThisWeek: number;
  overdueProjects: number;
  ticketsDueThisWeek: number;
  upcoming: {
    kind: 'project' | 'ticket';
    id: string;
    client: string;
    title: string;
    code: string;
    delivery: string;
    status: string;
  }[];
}

export default function OpsDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/ops/dashboard')
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Failed to load dashboard');
        setData(body);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load dashboard'));
  }, []);

  return (
    <OpsPageShell>
      <AdminPageHeader
        title="Projects & Tickets"
        description="Client onboarding, delivery schedules, tickets, and WhatsApp updates."
        action={
          <Link href="/admin/ops/create">
            <AdminButton variant="primary">+ Create Ticket</AdminButton>
          </Link>
        }
      />
      {error && <p className="text-sm text-rose-700">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AdminStatCard label="Active projects" value={data?.activeProjects ?? '—'} icon="FolderIcon" accent="blue" />
        <AdminStatCard label="Open tickets" value={data?.openTickets ?? '—'} icon="TicketIcon" />
        <AdminStatCard label="Bugs" value={data?.bugs ?? '—'} accent="rose" />
        <AdminStatCard label="Features" value={data?.features ?? '—'} accent="violet" />
        <AdminStatCard label="Enhancements" value={data?.enhancements ?? '—'} accent="amber" />
        <AdminStatCard label="Projects due this week" value={data?.projectsDueThisWeek ?? '—'} />
        <AdminStatCard label="Overdue projects" value={data?.overdueProjects ?? '—'} accent="rose" />
        <AdminStatCard label="Tickets due this week" value={data?.ticketsDueThisWeek ?? '—'} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/admin/ops/clients" className="text-xs font-medium text-indigo-600 hover:underline px-2.5 py-1 rounded-md bg-indigo-50">Clients</Link>
        <Link href="/admin/ops/projects" className="text-xs font-medium text-indigo-600 hover:underline px-2.5 py-1 rounded-md bg-indigo-50">Projects</Link>
        <Link href="/admin/ops/tickets" className="text-xs font-medium text-indigo-600 hover:underline px-2.5 py-1 rounded-md bg-indigo-50">Tickets</Link>
        <Link href="/admin/ops/create" className="text-xs font-medium text-indigo-600 hover:underline px-2.5 py-1 rounded-md bg-indigo-50">Create</Link>
      </div>

      <AdminSection title="Upcoming deliveries" description="Next 7 days">
        {(data?.upcoming.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No deliveries due in the next 7 days.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <OpsTh>Client</OpsTh>
                  <OpsTh>Item</OpsTh>
                  <OpsTh>Delivery</OpsTh>
                  <OpsTh>Status</OpsTh>
                </tr>
              </thead>
              <tbody>
                {data?.upcoming.map((row) => (
                  <tr key={`${row.kind}-${row.id}`} className="hover:bg-muted/20">
                    <OpsTd>{row.client}</OpsTd>
                    <OpsTd>
                      <Link
                        className="text-indigo-600 hover:underline font-medium"
                        href={row.kind === 'project' ? `/admin/ops/projects/${row.id}` : `/admin/ops/tickets/${row.id}`}
                      >
                        <span className="font-mono text-[11px] text-muted-foreground mr-1">{row.code}</span>
                        {row.title}
                      </Link>
                    </OpsTd>
                    <OpsTd className="whitespace-nowrap">{row.delivery}</OpsTd>
                    <OpsTd>
                      <AdminBadge>
                        {row.kind === 'project'
                          ? PROJECT_STATUS_LABELS[row.status as keyof typeof PROJECT_STATUS_LABELS] || row.status
                          : TICKET_STATUS_LABELS[row.status as keyof typeof TICKET_STATUS_LABELS] || row.status}
                      </AdminBadge>
                    </OpsTd>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>
    </OpsPageShell>
  );
}
