'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminAlert from '@/components/admin/AdminAlert';
import ClientForm from '@/components/admin/finance/ClientForm';
import { FinanceLink, FinanceShell } from '@/components/admin/finance/FinanceUi';

export default function EditFinanceClientPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || '';
  const router = useRouter();
  const [client, setClient] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/finance/clients/${id}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Client not found');
        setClient(body.client);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load client'));
  }, [id]);

  const save = async (payload: Record<string, unknown>) => {
    setSaving(true);
    setError('');
    const res = await fetch(`/api/admin/finance/clients/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    setSaving(false);
    if (!res.ok) return setError(body.error || 'Failed to update client');
    router.push(`/admin/finance/clients/${id}`);
  };

  return (
    <FinanceShell>
      <FinanceLink href="/admin/finance/clients">Back to clients</FinanceLink>
      <AdminPageHeader title={client ? `Edit ${String(client.name || 'client')}` : 'Edit client'} description="Update billing details. Existing invoices keep the snapshot taken when they were created." />
      {error && <AdminAlert variant="error">{error}</AdminAlert>}
      {client ? (
        <ClientForm initial={client} onSubmit={save} saving={saving} submitLabel="Save changes" />
      ) : !error ? (
        <p className="text-sm text-slate-500">Loading client…</p>
      ) : null}
    </FinanceShell>
  );
}
