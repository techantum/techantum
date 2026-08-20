'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import { adminInputClass } from '@/components/admin/AdminField';
import { OpsPageShell, OpsTd, OpsTh } from '@/components/admin/ops/OpsUi';
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
    <OpsPageShell>
      <AdminPageHeader
        title="Clients"
        description="One client can have many projects. Do not duplicate records for a new project."
        action={
          <Link href="/admin/ops/create">
            <AdminButton variant="primary">+ Create Ticket</AdminButton>
          </Link>
        }
      />
      {error && <p className="text-sm text-rose-700">{error}</p>}

      <AdminSection title={`${clients.length} client(s)`}>
        <div className="flex gap-2 mb-3">
          <input
            className={`${adminInputClass} max-w-sm`}
            placeholder="Search name, email, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
          <AdminButton onClick={load}>Search</AdminButton>
        </div>
        {clients.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No clients yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <OpsTh>Code</OpsTh>
                  <OpsTh>Name</OpsTh>
                  <OpsTh>WhatsApp</OpsTh>
                  <OpsTh>Email</OpsTh>
                  <OpsTh>Location</OpsTh>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-muted/20">
                    <OpsTd className="font-mono text-[11px]">{client.client_code}</OpsTd>
                    <OpsTd>
                      <Link className="text-indigo-600 hover:underline font-medium" href={`/admin/ops/clients/${client.id}`}>
                        {client.name}
                      </Link>
                    </OpsTd>
                    <OpsTd>{client.whatsapp_number || '—'}</OpsTd>
                    <OpsTd>{client.email || '—'}</OpsTd>
                    <OpsTd>{client.location || '—'}</OpsTd>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>
    </OpsPageShell>
  );
}
