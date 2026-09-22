'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminTabs from '@/components/admin/AdminTabs';
import AdminButton from '@/components/admin/AdminButton';
import AdminStatCard from '@/components/admin/AdminStatCard';
import { OpsOverviewField } from '@/components/admin/ops/OpsUi';
import { ProviderShell, ProviderTable, StatusPill, Td, when } from '@/components/admin/wa-provider/ProviderUi';

const TABS = [
  'Overview',
  'WABAs',
  'Phone Numbers',
  'Templates',
  'Messages',
  'Inbox',
  'Contacts',
  'Campaigns',
  'Automations',
  'Analytics',
  'Quality',
  'Integrations',
  'Billing',
  'Support',
  'Activity',
  'Audit Logs',
].map((label) => ({ id: label, label }));

export default function WaClientProfilePage() {
  const params = useParams<{ id: string }>();
  const [tab, setTab] = useState('Overview');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  const load = () => {
    fetch(`/api/admin/wa-provider/clients/${params.id}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load client');
        setData(body);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  };

  useEffect(load, [params.id]);

  const client = data?.client;
  const sync = async () => {
    await fetch(`/api/admin/wa-provider/clients/${params.id}/sync`, { method: 'POST' });
    load();
  };

  return (
    <ProviderShell>
      <AdminPageHeader
        title={client?.name || 'Client'}
        description="WhatsApp Business Account"
        action={
          <div className="flex gap-2">
            <AdminButton onClick={sync}>Sync Meta</AdminButton>
            <Link href="/admin/wa-provider/messages">
              <AdminButton variant="secondary">Messages</AdminButton>
            </Link>
          </div>
        }
      />
      {error && <p className="text-sm text-rose-700">{error}</p>}
      {client && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-2 lg:grid-cols-5 gap-3">
          <OpsOverviewField label="Platform Health">
            <StatusPill value={client.platform_health} />
          </OpsOverviewField>
          <OpsOverviewField label="Onboarding">
            <StatusPill value={client.onboarding_status} />
          </OpsOverviewField>
          <OpsOverviewField label="Meta connection">
            <StatusPill value={client.meta_connection_status} />
          </OpsOverviewField>
          <OpsOverviewField label="Primary number">{data.phones?.[0]?.display_phone_number || '—'}</OpsOverviewField>
          <OpsOverviewField label="Last sync">{when(client.last_synced_at)}</OpsOverviewField>
        </div>
      )}
      <AdminTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'Overview' && client && (
        <AdminSection title="Overview" description="Platform Health is an internal operational score, not an official Meta rating.">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <AdminStatCard label="Sent this month" value={data.stats?.sent ?? 0} />
            <AdminStatCard label="Delivered" value={data.stats?.delivered ?? 0} accent="green" />
            <AdminStatCard label="Read" value={data.stats?.read ?? 0} accent="blue" />
            <AdminStatCard label="Failed" value={data.stats?.failed ?? 0} accent="rose" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <OpsOverviewField label="Why this health status">{(client.platform_health_reasons || []).join(' · ') || '—'}</OpsOverviewField>
            <OpsOverviewField label="Last API activity">{when(client.last_api_activity_at)}</OpsOverviewField>
          </div>
          <details className="rounded-lg border border-slate-200 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">Technical details</summary>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono text-slate-600">
              <p>Meta Business ID: {client.meta_business_id || '—'}</p>
              {(data.wabas || []).map((w: any) => (
                <p key={w.id}>WABA: {w.waba_id}</p>
              ))}
              {(data.phones || []).map((p: any) => (
                <p key={p.id}>
                  Phone ID: {p.phone_number_id} ({p.display_phone_number})
                </p>
              ))}
            </div>
          </details>
        </AdminSection>
      )}

      {tab === 'WABAs' && (
        <AdminSection title="WABA accounts">
          <ProviderTable
            columns={['Name', 'WABA ID', 'Status', 'Webhooks', 'Last sync']}
            rows={(data?.wabas || []).map((row: any) => (
              <tr key={row.id}>
                <Td>{row.name}</Td>
                <Td className="font-mono text-xs">{row.waba_id}</Td>
                <Td>
                  <StatusPill value={row.account_status} />
                </Td>
                <Td>{row.webhook_subscribed ? 'Subscribed' : 'Not subscribed'}</Td>
                <Td>{when(row.last_synced_at)}</Td>
              </tr>
            ))}
          />
        </AdminSection>
      )}

      {tab === 'Phone Numbers' && (
        <AdminSection title="Phone numbers">
          <ProviderTable
            columns={['Number', 'Verified name', 'Quality', 'Registration', 'Messaging']}
            rows={(data?.phones || []).map((row: any) => (
              <tr key={row.id}>
                <Td>{row.display_phone_number}</Td>
                <Td>{row.verified_name}</Td>
                <Td>
                  <StatusPill value={row.quality_rating} />
                </Td>
                <Td>
                  <StatusPill value={row.registration_status} />
                </Td>
                <Td>{row.messaging_status}</Td>
              </tr>
            ))}
          />
        </AdminSection>
      )}

      {tab === 'Templates' && (
        <AdminSection title="Templates">
          <ProviderTable
            columns={['Status']}
            rows={(data?.templates || []).map((row: any) => (
              <tr key={row.id}>
                <Td>
                  <StatusPill value={row.internal_status} />
                </Td>
              </tr>
            ))}
          />
        </AdminSection>
      )}

      {['Messages', 'Inbox', 'Contacts', 'Campaigns', 'Automations', 'Analytics', 'Quality', 'Billing', 'Support', 'Audit Logs'].includes(tab) && (
        <AdminSection title={tab}>
          <p className="text-sm text-slate-600">
            Open the dedicated {tab.toLowerCase()} workspace, already filtered for this client from the provider navigation.
          </p>
          <Link href={`/admin/wa-provider/${tab === 'Phone Numbers' ? 'phones' : tab.toLowerCase().replace(' ', '-')}${tab === 'Audit Logs' ? '' : ''}`}>
            <AdminButton variant="primary">Open {tab}</AdminButton>
          </Link>
        </AdminSection>
      )}
    </ProviderShell>
  );
}
