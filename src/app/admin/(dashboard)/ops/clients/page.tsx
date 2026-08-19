'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import { adminInputClass } from '@/components/admin/AdminField';
import type { OpsClient } from '@/lib/ops/types';

export default function OpsClientsPage() {
  const [clients, setClients] = useState<OpsClient[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    fetch(`/api/admin/ops/clients?search=${encodeURIComponent(search)}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Failed to load clients');
        setClients(body);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load clients'));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6 max-w-6xl">
      <AdminPageHeader
        title="Clients"
        description="One client can have many projects. Do not duplicate records for a new project."
        action={<Link href="/admin/ops/create"><AdminButton variant="primary">+ Create Ticket</AdminButton></Link>}
      />
      {error && <p className="text-sm text-rose-700">{error}</p>}
      <AdminSection title="All clients">
        <div className="flex gap-2">
          <input className={adminInputClass} placeholder="Search name, email, phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <AdminButton onClick={load}>Search</AdminButton>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-2 pr-3">Code</th>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">WhatsApp</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Location</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-b border-border/60">
                  <td className="py-2 pr-3 font-mono text-xs">{client.client_code}</td>
                  <td className="py-2 pr-3"><Link className="text-indigo-600 hover:underline" href={`/admin/ops/clients/${client.id}`}>{client.name}</Link></td>
                  <td className="py-2 pr-3">{client.whatsapp_number || '—'}</td>
                  <td className="py-2 pr-3">{client.email || '—'}</td>
                  <td className="py-2 pr-3">{client.location || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {clients.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No clients yet.</p>}
        </div>
      </AdminSection>
    </div>
  );
}
