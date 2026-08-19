'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminStatCard from '@/components/admin/AdminStatCard';
import AdminButton from '@/components/admin/AdminButton';
import AdminBadge from '@/components/admin/AdminBadge';
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
    <div className="space-y-6 max-w-7xl">
      <AdminPageHeader
        title="Projects & Tickets"
        description="Client onboarding, delivery schedules, tickets, and WhatsApp updates."
        action={<Link href="/admin/ops/create"><AdminButton variant="primary">+ Create Ticket</AdminButton></Link>}
      />
      {error && <p className="text-sm text-rose-700">{error}</p>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminStatCard label="Active projects" value={data?.activeProjects ?? '—'} icon="FolderIcon" accent="blue" />
        <AdminStatCard label="Open tickets" value={data?.openTickets ?? '—'} icon="TicketIcon" />
        <AdminStatCard label="Bugs" value={data?.bugs ?? '—'} accent="rose" />
        <AdminStatCard label="Features" value={data?.features ?? '—'} accent="violet" />
        <AdminStatCard label="Enhancements" value={data?.enhancements ?? '—'} accent="amber" />
        <AdminStatCard label="Projects due this week" value={data?.projectsDueThisWeek ?? '—'} />
        <AdminStatCard label="Overdue projects" value={data?.overdueProjects ?? '—'} accent="rose" />
        <AdminStatCard label="Tickets due this week" value={data?.ticketsDueThisWeek ?? '—'} />
      </div>
      <AdminSection title="Upcoming deliveries">
        {(data?.upcoming.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">No deliveries due in the next 7 days.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 pr-3">Client</th>
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3">Delivery</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.upcoming.map((row) => (
                  <tr key={`${row.kind}-${row.id}`} className="border-b border-border/60">
                    <td className="py-2 pr-3">{row.client}</td>
                    <td className="py-2 pr-3">
                      <Link className="text-indigo-600 hover:underline" href={row.kind === 'project' ? `/admin/ops/projects/${row.id}` : `/admin/ops/tickets/${row.id}`}>
                        {row.code} · {row.title}
                      </Link>
                    </td>
                    <td className="py-2 pr-3">{row.delivery}</td>
                    <td className="py-2 pr-3">
                      <AdminBadge>
                        {row.kind === 'project'
                          ? PROJECT_STATUS_LABELS[row.status as keyof typeof PROJECT_STATUS_LABELS] || row.status
                          : TICKET_STATUS_LABELS[row.status as keyof typeof TICKET_STATUS_LABELS] || row.status}
                      </AdminBadge>
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
