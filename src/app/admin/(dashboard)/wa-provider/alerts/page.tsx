'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import { ProviderLink, ProviderShell, ProviderTable, StatusPill, Td, when } from '@/components/admin/wa-provider/ProviderUi';

export default function AlertsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const load = () => fetch('/api/admin/wa-provider/alerts').then((r) => r.json()).then((b) => setRows(b.rows || []));
  useEffect(() => { load(); }, []);
  const act = async (id: string, action: string) => {
    await fetch(`/api/admin/wa-provider/alerts/${id}/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: 'Reviewed' }) });
    load();
  };
  return (
    <ProviderShell>
      <AdminPageHeader title="Alerts" description="Quality, webhook, template and onboarding issues across all clients." />
      <AdminSection title="Alert centre">
        <ProviderTable
          columns={['Title', 'Type', 'Severity', 'Status', 'Created', 'Actions']}
          rows={rows.map((row) => (
            <tr key={row.id}>
              <Td>
                {row.client_id ? <ProviderLink href={`/admin/wa-provider/clients/${row.client_id}`}>{row.title}</ProviderLink> : row.title}
                <p className="text-[11px] text-slate-500">{row.description}</p>
              </Td>
              <Td>{row.type}</Td>
              <Td><StatusPill value={row.severity} /></Td>
              <Td><StatusPill value={row.status} /></Td>
              <Td>{when(row.created_at)}</Td>
              <Td>
                <div className="flex gap-2 text-xs">
                  <AdminButton size="sm" onClick={() => act(row.id, 'acknowledge')}>Acknowledge</AdminButton>
                  <AdminButton size="sm" onClick={() => act(row.id, 'resolve')}>Resolve</AdminButton>
                </div>
              </Td>
            </tr>
          ))}
        />
      </AdminSection>
    </ProviderShell>
  );
}
