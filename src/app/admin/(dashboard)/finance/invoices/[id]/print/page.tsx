'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import InvoiceDocument from '@/components/admin/finance/InvoiceDocument';
import AdminButton from '@/components/admin/AdminButton';

export default function InvoicePrintPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || '';
  const [detail, setDetail] = useState<{ invoice: Record<string, unknown>; items: Record<string, unknown>[] } | null>(null);

  useEffect(() => {
    fetch(`/api/admin/finance/invoices/${id}`)
      .then((r) => r.json())
      .then(setDetail);
  }, [id]);

  useEffect(() => {
    if (detail?.invoice) {
      const timer = window.setTimeout(() => window.print(), 400);
      return () => window.clearTimeout(timer);
    }
  }, [detail]);

  if (!detail?.invoice) return <p className="p-6 text-sm text-slate-500">Loading invoice…</p>;

  return (
    <div className="bg-white">
      <div className="print:hidden mb-4 flex gap-2">
        <AdminButton variant="primary" onClick={() => window.print()}>Print</AdminButton>
        <a href={`/admin/finance/invoices/${id}`}>
          <AdminButton>Back</AdminButton>
        </a>
      </div>
      <InvoiceDocument invoice={detail.invoice} items={detail.items || []} />
    </div>
  );
}
