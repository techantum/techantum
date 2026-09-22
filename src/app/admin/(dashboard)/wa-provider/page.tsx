'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminStatCard from '@/components/admin/AdminStatCard';
import AdminButton from '@/components/admin/AdminButton';
import AdminField, { adminSelectClass } from '@/components/admin/AdminField';
import { ProviderLink, ProviderShell, ProviderTable, StatusPill, Td, when } from '@/components/admin/wa-provider/ProviderUi';

type Dashboard = {
  cards: Record<string, number>;
  performance: Record<string, number>;
  series: { date: string; sent: number; delivered: number; read: number; failed: number }[];
  clientUsage: { name: string; messages: number }[];
  templatePerformance: { name: string; sent: number; deliveryRate: number; readRate: number }[];
  quality: Record<string, number>;
  templateStatus: Record<string, number>;
  needsAttention: { id: string; client: string; clientId?: string; issue: string; severity: string; since: string; status: string }[];
};

const RANGES = [
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
  ['last_7', 'Last 7 Days'],
  ['last_30', 'Last 30 Days'],
  ['this_month', 'This Month'],
  ['previous_month', 'Previous Month'],
];

const QUALITY_COLORS = { GREEN: '#059669', YELLOW: '#d97706', RED: '#e11d48', UNKNOWN: '#64748b' };

export default function WaProviderDashboardPage() {
  const [range, setRange] = useState('last_7');
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/admin/wa-provider/dashboard?range=${range}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load dashboard');
        setData(body);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, [range]);

  const cards = data?.cards;
  const qualityData = Object.entries(data?.quality || {}).map(([name, value]) => ({ name, value }));
  const templateData = Object.entries(data?.templateStatus || {}).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));

  return (
    <ProviderShell>
      <AdminPageHeader
        title="WhatsApp Business Provider"
        description="Manage client WhatsApp Business accounts, quality, templates and operational health."
        action={
          <Link href="/admin/wa-provider/onboard">
            <AdminButton variant="primary">Onboard Client</AdminButton>
          </Link>
        }
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <AdminField label="Date range">
          <select className={adminSelectClass} value={range} onChange={(e) => setRange(e.target.value)}>
            {RANGES.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </AdminField>
      </div>

      {error && <p className="text-sm text-rose-700">{error}</p>}

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <AdminStatCard label="Clients" value={cards?.totalClients ?? '—'} hint={`${cards?.activeClients ?? 0} active`} icon="BuildingOffice2Icon" />
        <AdminStatCard label="WABAs" value={cards?.totalWabas ?? '—'} icon="IdentificationIcon" accent="blue" />
        <AdminStatCard label="Active numbers" value={cards?.activePhones ?? '—'} icon="PhoneIcon" accent="green" />
        <AdminStatCard label="Messages today" value={cards?.messagesToday ?? '—'} hint={`${cards?.messagesMonth ?? 0} this month`} icon="ChatBubbleBottomCenterTextIcon" accent="violet" />
        <AdminStatCard label="Delivery rate" value={data ? `${data.performance.deliveryRate}%` : '—'} hint={`${data?.performance.failed ?? 0} failed`} icon="ChartBarIcon" accent="amber" />
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <AdminStatCard label="Sent" value={data?.performance.sent ?? '—'} />
        <AdminStatCard label="Delivered" value={data?.performance.delivered ?? '—'} accent="green" />
        <AdminStatCard label="Read" value={data?.performance.read ?? '—'} accent="blue" />
        <AdminStatCard label="Templates pending" value={cards?.templatesPending ?? '—'} accent="amber" />
        <AdminStatCard label="API / webhook errors" value={cards?.apiWebhookErrors ?? '—'} accent="rose" />
      </div>

      <AdminSection title="Needs Attention" description="Operational issues that should be reviewed without opening Meta Business Manager." accent="amber">
        <ProviderTable
          columns={['Client', 'Issue', 'Severity', 'Since', 'Action']}
          empty="No open issues."
          rows={(data?.needsAttention || []).map((row) => (
            <tr key={row.id} className="hover:bg-slate-50">
              <Td>{row.clientId ? <ProviderLink href={`/admin/wa-provider/clients/${row.clientId}`}>{row.client}</ProviderLink> : row.client}</Td>
              <Td>{row.issue}</Td>
              <Td>
                <StatusPill value={row.severity} />
              </Td>
              <Td>{when(row.since)}</Td>
              <Td>
                <Link href="/admin/wa-provider/alerts" className="text-indigo-700 hover:underline">
                  View
                </Link>
              </Td>
            </tr>
          ))}
        />
      </AdminSection>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <AdminSection title="Message Performance">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.series || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sent" stroke="#4f46e5" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="delivered" stroke="#059669" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="read" stroke="#0284c7" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="failed" stroke="#e11d48" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </AdminSection>
        <AdminSection title="Account Health" description="Phone quality distribution. This is platform monitoring, not an official Meta score.">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={qualityData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                  {qualityData.map((entry) => (
                    <Cell key={entry.name} fill={QUALITY_COLORS[entry.name as keyof typeof QUALITY_COLORS] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </AdminSection>
        <AdminSection title="Template Overview">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={templateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminSection>
        <AdminSection title="Client Usage">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.clientUsage || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="messages" fill="#0f766e" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminSection>
      </div>
    </ProviderShell>
  );
}
