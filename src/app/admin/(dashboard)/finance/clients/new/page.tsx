'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminAlert from '@/components/admin/AdminAlert';
import ClientForm from '@/components/admin/finance/ClientForm';
import { FinanceLink, FinanceShell } from '@/components/admin/finance/FinanceUi';

export default function NewFinanceClientPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async (payload: Record<string, unknown>) => {
    setSaving(true);
    setError('');
    const res = await fetch('/api/admin/finance/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    setSaving(false);
    if (!res.ok) return setError(body.error || 'Failed to save client');
    router.push(`/admin/finance/clients/${body.id}`);
  };

  return (
    <FinanceShell>
      <FinanceLink href="/admin/finance/clients">Back to clients</FinanceLink>
      <AdminPageHeader title="Add Client" description="Indian GST fields stay optional unless GST Registered is Yes. International clients do not require GSTIN or PAN." />
      {error && <AdminAlert variant="error">{error}</AdminAlert>}
      <ClientForm onSubmit={save} saving={saving} submitLabel="Save client" />
    </FinanceShell>
  );
}
