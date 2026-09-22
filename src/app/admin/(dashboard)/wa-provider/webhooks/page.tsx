'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import { ProviderShell, ProviderTable, StatusPill, Td, when } from '@/components/admin/wa-provider/ProviderUi';

export default function WebhooksPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [payload, setPayload] = useState<any>(null);
  const load = () => fetch('/api/admin/wa-provider/webhooks').then((r) => r.json()).then((b) => setRows(b.rows || []));
  useEffect(() => { load(); }, []);
  return (
    <ProviderShell>
      <AdminPageHeader title="Webhooks" description="Raw Meta events are persisted first, then processed asynchronously with idempotency." />
      <AdminSection title="Webhook events">
        <ProviderTable
          columns={['Received', 'WABA', 'Event', 'Status', 'Attempts', 'Error', 'Actions']}
          rows={rows.map((row) => (
            <tr key={row.id}>
              <Td>{when(row.received_at)}</Td>
              <Td className="font-mono text-xs">{row.waba_id || '—'}</Td>
              <Td>{row.event_type}</Td>
              <Td><StatusPill value={row.processing_status} /></Td>
              <Td>{row.attempts}</Td>
              <Td className="text-xs text-rose-700">{row.error_message || '—'}</Td>
              <Td>
                <div className="flex gap-2">
                  <AdminButton size="sm" onClick={async () => {
                    const res = await fetch(`/api/admin/wa-provider/webhooks/${row.id}/payload`, { method: 'POST' });
                    setPayload(await res.json());
                  }}>Payload</AdminButton>
                  <AdminButton size="sm" onClick={async () => { await fetch(`/api/admin/wa-provider/webhooks/${row.id}/reprocess`, { method: 'POST' }); load(); }}>Reprocess</AdminButton>
                </div>
              </Td>
            </tr>
          ))}
        />
      </AdminSection>
      {payload && (
        <AdminSection title="Payload viewer">
          <pre className="text-xs overflow-auto rounded-lg bg-slate-950 text-slate-100 p-3 max-h-80">{JSON.stringify(payload, null, 2)}</pre>
        </AdminSection>
      )}
    </ProviderShell>
  );
}
