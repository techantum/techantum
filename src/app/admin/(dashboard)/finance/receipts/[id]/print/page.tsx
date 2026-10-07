'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminButton from '@/components/admin/AdminButton';
import { money } from '@/components/admin/finance/FinanceUi';

export default function ReceiptPrintPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || '';
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch(`/api/admin/finance/receipts/${id}`).then((r) => r.json()).then(setDetail);
  }, [id]);

  useEffect(() => {
    if (detail) {
      const t = window.setTimeout(() => window.print(), 400);
      return () => window.clearTimeout(t);
    }
  }, [detail]);

  const receipt = (detail?.receipt || detail?.expense) as Record<string, string> | undefined;
  if (!receipt) return <p className="p-6 text-sm">Loading…</p>;
  const tax = Number(receipt.cgst || 0) + Number(receipt.sgst || 0) + Number(receipt.igst || 0) + Number(receipt.other_tax || 0);

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 text-slate-900">
      <div className="print:hidden mb-4 flex gap-2">
        <AdminButton variant="primary" onClick={() => window.print()}>Print</AdminButton>
        <a href={`/admin/finance/receipts/${id}`}><AdminButton>Back</AdminButton></a>
      </div>
      <h1 className="text-xl font-semibold">Receipt summary</h1>
      <p className="text-sm text-slate-500">{receipt.receipt_number}</p>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <dt>Date</dt><dd>{receipt.expense_date}</dd>
        <dt>Vendor</dt><dd>{receipt.vendor_name}</dd>
        <dt>Category</dt><dd>{receipt.category_name || '—'}</dd>
        <dt>Description</dt><dd>{receipt.description}</dd>
        <dt>Vendor bill</dt><dd>{receipt.vendor_invoice_number || '—'}</dd>
        <dt>Taxable</dt><dd>{money(receipt.taxable_amount)}</dd>
        <dt>GST / Tax</dt><dd>{money(tax)}</dd>
        <dt>Total</dt><dd>{money(receipt.total_amount)}</dd>
        <dt>Amount paid</dt><dd>{money(receipt.amount_paid)}</dd>
        <dt>Mode</dt><dd>{receipt.payment_mode || '—'}</dd>
        <dt>Reference</dt><dd>{receipt.transaction_reference || '—'}</dd>
      </dl>
    </div>
  );
}
