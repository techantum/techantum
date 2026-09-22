'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import AdminField, { adminInputClass, adminSelectClass } from '@/components/admin/AdminField';
import { ProviderLink, ProviderShell, ProviderTable, StatusPill, Td, when } from '@/components/admin/wa-provider/ProviderUi';

type ClientRow = {
  id: string;
  name: string;
  legal_name?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  meta_business_id?: string;
  waba_count: number;
  phone_count: number;
  onboarding_status: string;
  platform_health: string;
  messages_this_month: number;
  created_at: string;
  assigned_manager_id?: string;
  status: string;
};

export default function WaClientsPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('ALL');
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [error, setError] = useState('');

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
    const timer = window.setTimeout(load, 200);
    return () => window.clearTimeout(timer);
  }, [q, status]);

  const act = async (id: string, action: string) => {
    if (action === 'sync') await fetch(`/api/admin/wa-provider/clients/${id}/sync`, { method: 'POST' });
    if (action === 'disable') await fetch(`/api/admin/wa-provider/clients/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'SUSPENDED' }) });
    if (action === 'archive') await fetch(`/api/admin/wa-provider/clients/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'ARCHIVED' }) });
    load();
  };

  return (
    <ProviderShell>
      <AdminPageHeader
        title="Clients"
        description="Every onboarded WhatsApp Business customer on this Tech Provider account."
        action={
          <Link href="/admin/wa-provider/onboard">
            <AdminButton variant="primary">Onboard Client</AdminButton>
          </Link>
        }
      />
      <AdminSection title="Client directory">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <AdminField label="Search">
            <input className={adminInputClass} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, phone, Business ID" />
          </AdminField>
          <AdminField label="Filter">
            <select className={adminSelectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ALL">All</option>
              <option value="ACTIVE">Active</option>
              <option value="ONBOARDING">Onboarding</option>
              <option value="ATTENTION">Attention required</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </AdminField>
        </div>
        {error && <p className="text-sm text-rose-700">{error}</p>}
        <ProviderTable
          columns={['Client', 'Contact', 'Meta Business ID', 'WABAs', 'Numbers', 'Onboarding', 'Platform Health', 'Msgs / month', 'Created', 'Status', 'Actions']}
          empty="No clients yet. Start onboarding."
          rows={rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50">
              <Td>
                <ProviderLink href={`/admin/wa-provider/clients/${row.id}`}>{row.name}</ProviderLink>
                <p className="text-[11px] text-slate-500">{row.legal_name}</p>
              </Td>
              <Td>
                <p>{row.contact_name || '—'}</p>
                <p className="text-[11px] text-slate-500">{row.email}</p>
                <p className="text-[11px] text-slate-500">{row.phone}</p>
              </Td>
              <Td className="font-mono text-xs">{row.meta_business_id || '—'}</Td>
              <Td>{row.waba_count}</Td>
              <Td>{row.phone_count}</Td>
              <Td>
                <StatusPill value={row.onboarding_status} />
              </Td>
              <Td>
                <StatusPill value={row.platform_health} />
              </Td>
              <Td>{row.messages_this_month}</Td>
              <Td>{when(row.created_at)}</Td>
              <Td>
                <StatusPill value={row.status} />
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  <Link href={`/admin/wa-provider/clients/${row.id}`} className="text-xs text-indigo-700 hover:underline">
                    View
                  </Link>
                  <button type="button" className="text-xs text-indigo-700 hover:underline" onClick={() => act(row.id, 'sync')}>
                    Sync
                  </button>
                  <button type="button" className="text-xs text-slate-600 hover:underline" onClick={() => act(row.id, 'disable')}>
                    Disable
                  </button>
                </div>
              </Td>
            </tr>
          ))}
        />
      </AdminSection>
    </ProviderShell>
  );
}
