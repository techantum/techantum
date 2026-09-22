'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import { OpsOverviewField } from '@/components/admin/ops/OpsUi';
import { ProviderShell, StatusPill, when } from '@/components/admin/wa-provider/ProviderUi';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const load = () => fetch('/api/admin/wa-provider/settings').then((r) => r.json()).then(setSettings);
  useEffect(() => { load(); }, []);
  return (
    <ProviderShell>
      <AdminPageHeader
        title="Meta Integration"
        description="Read-only health of the Tech Provider Meta app. Health checks do not change client resources."
        action={
          <div className="flex gap-2">
            <AdminButton
              onClick={async () => {
                const res = await fetch('/api/admin/wa-provider/seed', { method: 'POST' });
                setHealth(await res.json());
              }}
            >
              Load demo data
            </AdminButton>
            <AdminButton
              variant="primary"
              onClick={async () => {
                const res = await fetch('/api/admin/wa-provider/health', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
                setHealth(await res.json());
              }}
            >
              Run health check
            </AdminButton>
          </div>
        }
      />
      <AdminSection title="Connection">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <OpsOverviewField label="Graph API version">{settings?.graphVersion || 'Not set'}</OpsOverviewField>
          <OpsOverviewField label="Meta App">{settings?.appConfigured ? 'Connected' : 'Missing'}</OpsOverviewField>
          <OpsOverviewField label="Embedded Signup">{settings?.embeddedSignup ? 'Active' : 'Not configured'}</OpsOverviewField>
          <OpsOverviewField label="Webhook">{settings?.webhookConfigured ? 'Configured' : 'Missing'}</OpsOverviewField>
          <OpsOverviewField label="System integration">{settings?.systemToken ? 'Connected' : 'Missing token'}</OpsOverviewField>
          <OpsOverviewField label="Credit sharing">{settings?.creditSharing ? 'Enabled' : 'Disabled'}</OpsOverviewField>
          <OpsOverviewField label="Last Meta request">{when(settings?.lastApi?.created_at)}</OpsOverviewField>
          <OpsOverviewField label="Last webhook">{when(settings?.lastWebhook?.received_at)}</OpsOverviewField>
        </div>
      </AdminSection>
      <AdminSection title="Permissions">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2">Permission</th>
              <th className="text-left py-2">Required for</th>
              <th className="text-left py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {(settings?.permissions || []).map((row: any) => (
              <tr key={row.permission} className="border-t">
                <td className="py-2 font-mono text-xs">{row.permission}</td>
                <td>{row.requiredFor}</td>
                <td><StatusPill value={settings?.systemToken ? 'Configured' : 'Unknown'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminSection>
      {health && (
        <AdminSection title="Health check result">
          <pre className="text-xs overflow-auto rounded-lg bg-slate-50 p-3">{JSON.stringify(health, null, 2)}</pre>
        </AdminSection>
      )}
    </ProviderShell>
  );
}
