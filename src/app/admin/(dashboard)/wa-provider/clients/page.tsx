'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminField, { adminInputClass, adminSelectClass } from '@/components/admin/AdminField';
import { ProviderLink, ProviderShell, ProviderTable, StatusPill, Td } from '@/components/admin/wa-provider/ProviderUi';

type ClientRow = {
  id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  waba_count: number;
  phone_count: number;
  onboarding_status: string;
  platform_health: string;
  messages_this_month: number;
  meta_connection_status?: string;
  status: string;
};

export default function WaClientsPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('ONBOARDED');
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [error, setError] = useState('');
  const [onboardUrls, setOnboardUrls] = useState<{ zeroIntegration?: string; hostedEmbeddedSignup?: string }>({});
  const [copied, setCopied] = useState('');

  const load = () => {
    fetch(`/api/admin/wa-provider/clients?q=${encodeURIComponent(q)}&status=${status}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load clients');
        setRows(body.rows || []);
        setError('');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  };

  useEffect(() => {
    fetch('/api/public/wa-onboard/config', { cache: 'no-store' })
      .then((res) => res.json())
      .then((body) => setOnboardUrls(body.urls || {}))
      .catch(() => undefined);
  }, []);

  const copy = async (label: string, value?: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(''), 2000);
  };

  useEffect(() => {
    const timer = window.setTimeout(load, 200);
    return () => window.clearTimeout(timer);
  }, [q, status]);

  return (
    <ProviderShell>
      <AdminPageHeader
        title="Onboarded Clients"
        description="Clients complete WhatsApp setup with Techantum’s Meta Tech Provider onboarding. Share the Meta links below, or send them to /portal/wa/onboard."
      />
      <AdminSection title="Client onboarding links">
        <p className="text-sm text-slate-600">
          Official Meta Tech Provider URLs for app <span className="font-mono">27686807767646135</span>. Meta-hosted Embedded Signup returns to{' '}
          <span className="font-mono">https://techantum.com/auth/facebook</span>.
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">Zero integration onboarding</p>
            <p className="mt-1 text-xs text-slate-500">Client finishes WhatsApp Business app setup on Meta. No redirect back.</p>
            <p className="mt-3 break-all font-mono text-[11px] text-slate-600">{onboardUrls.zeroIntegration || 'Loading…'}</p>
            <button
              type="button"
              onClick={() => void copy('zero', onboardUrls.zeroIntegration)}
              className="mt-3 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold"
            >
              {copied === 'zero' ? 'Copied' : 'Copy link'}
            </button>
          </div>
          <div className="rounded-2xl border border-secondary/30 bg-orange-50/60 p-4">
            <p className="text-sm font-semibold text-slate-900">Meta-hosted Embedded Signup</p>
            <p className="mt-1 text-xs text-slate-500">Recommended. Client returns to Techantum so the WABA can be imported.</p>
            <p className="mt-3 break-all font-mono text-[11px] text-slate-600">{onboardUrls.hostedEmbeddedSignup || 'Loading…'}</p>
            <button
              type="button"
              onClick={() => void copy('hosted', onboardUrls.hostedEmbeddedSignup)}
              className="mt-3 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-white"
            >
              {copied === 'hosted' ? 'Copied' : 'Copy link'}
            </button>
          </div>
        </div>
      </AdminSection>
      <AdminSection title="Client directory">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AdminField label="Search">
            <input className={adminInputClass} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, phone" />
          </AdminField>
          <AdminField label="Filter">
            <select className={adminSelectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ONBOARDED">Onboarded</option>
              <option value="ACTIVE">Active</option>
              <option value="ATTENTION">Needs attention</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </AdminField>
        </div>
        {error && <p className="text-sm text-rose-700">{error}</p>}
        <ProviderTable
          columns={['Client', 'Contact', 'Numbers', 'Health', 'Messages this month', 'Status']}
          empty="No onboarded clients yet. Clients complete setup from the website."
          rows={rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50">
              <Td>
                <ProviderLink href={`/admin/wa-provider/clients/${row.id}`}>{row.name}</ProviderLink>
              </Td>
              <Td>
                <p>{row.contact_name || row.email || '—'}</p>
                <p className="text-[11px] text-slate-500">{row.phone}</p>
              </Td>
              <Td>{row.phone_count}</Td>
              <Td>
                <StatusPill value={row.platform_health} />
              </Td>
              <Td>{row.messages_this_month}</Td>
              <Td>
                <StatusPill value={row.meta_connection_status || row.status} />
              </Td>
            </tr>
          ))}
        />
      </AdminSection>
    </ProviderShell>
  );
}
