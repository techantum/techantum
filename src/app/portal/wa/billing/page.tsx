'use client';

import { useEffect, useState } from 'react';

export default function PortalBillingPage() {
  const [billing, setBilling] = useState<any>(null);
  useEffect(() => {
    fetch('/api/portal/wa/billing').then((r) => r.json()).then((b) => setBilling(b.billing));
  }, []);
  return (
    <div className="space-y-4">
      <h1 className="font-bricolage text-2xl font-bold">Billing</h1>
      <div className="rounded-xl border bg-white p-4 text-sm space-y-2">
        <p>Plan: {billing?.plan || '—'}</p>
        <p>Monthly fee: {billing?.monthly_fee ?? '—'}</p>
        <p>Invoice: {billing?.invoice_status || '—'}</p>
        <p>Outstanding: {billing?.outstanding_amount ?? 0}</p>
      </div>
    </div>
  );
}
