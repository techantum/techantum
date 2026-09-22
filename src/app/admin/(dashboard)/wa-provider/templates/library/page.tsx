'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import { adminSelectClass } from '@/components/admin/AdminField';
import { ProviderShell } from '@/components/admin/wa-provider/ProviderUi';

export default function TemplateLibraryPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [clientId, setClientId] = useState('');
  useEffect(() => {
    fetch('/api/admin/wa-provider/templates/library').then((r) => r.json()).then((b) => setRows(b.rows || []));
    fetch('/api/admin/wa-provider/clients').then((r) => r.json()).then((b) => setClients(b.rows || []));
  }, []);
  return (
    <ProviderShell>
      <AdminPageHeader title="Template library" description="Master templates. Use Template creates a client-owned copy. Nothing is submitted to Meta automatically." />
      <AdminSection title="Master templates">
        <select className={adminSelectClass} value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">Select client for copy</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <div className="grid md:grid-cols-2 gap-3 mt-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs uppercase text-slate-500">{row.category}</p>
              <p className="font-semibold">{row.name}</p>
              <p className="text-sm text-slate-600 mt-1">{row.body}</p>
              <AdminButton
                size="sm"
                className="mt-2"
                disabled={!clientId}
                onClick={async () => {
                  await fetch('/api/admin/wa-provider/templates/library/use', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ libraryId: row.id, clientId }) });
                }}
              >
                Use Template
              </AdminButton>
            </div>
          ))}
        </div>
      </AdminSection>
    </ProviderShell>
  );
}
