'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import AdminAlert from '@/components/admin/AdminAlert';
import { FinanceLink, FinanceShell, FinanceTd, FinanceTh, StatusBadge, money } from '@/components/admin/finance/FinanceUi';

export default function ReceiptDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || '';
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/admin/finance/receipts/${id}`).then(async (r) => {
      const body = await r.json();
      if (!r.ok) throw new Error(body.error);
      setDetail(body);
    }).catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  }, [id]);

  const receipt = (detail?.receipt || detail?.expense) as Record<string, string> | undefined;
  const payments = (detail?.payments || []) as Record<string, string>[];
  const documents = (detail?.documents || []) as Record<string, string>[];
  const tax = receipt ? Number(receipt.cgst || 0) + Number(receipt.sgst || 0) + Number(receipt.igst || 0) + Number(receipt.other_tax || 0) : 0;

  return (
    <FinanceShell>
      <FinanceLink href="/admin/finance/receipts">Back to receipts</FinanceLink>
      <AdminPageHeader
        title={receipt?.receipt_number || 'Receipt'}
        description={receipt ? `${receipt.vendor_name} · ${receipt.description}` : ''}
        action={
          <div className="flex gap-2 print:hidden">
            <a href={`/admin/finance/receipts/${id}/print`}><AdminButton>Print Receipt Summary</AdminButton></a>
          </div>
        }
      />
      {error && <AdminAlert variant="error">{error}</AdminAlert>}
      {receipt && (
        <AdminSection title="Receipt details">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 text-sm">
            <div>Date {receipt.expense_date}</div>
            <div>Vendor {receipt.vendor_name}</div>
            <div>Category {receipt.category_name || '—'}</div>
            <div><StatusBadge value={receipt.payment_status} /></div>
            <div>Vendor bill {receipt.vendor_invoice_number || '—'}</div>
            <div>Taxable {money(receipt.taxable_amount)}</div>
            <div>GST / Tax {money(tax)}</div>
            <div>Total {money(receipt.total_amount)}</div>
            <div>Paid {money(receipt.amount_paid)}</div>
            <div>Mode {receipt.payment_mode || '—'}</div>
            <div>Reference {receipt.transaction_reference || '—'}</div>
            <div>Created by {receipt.created_by_email || '—'}</div>
          </div>
        </AdminSection>
      )}
      <AdminSection title="Supporting documents">
        <ul className="space-y-1 text-sm">
          {documents.map((d) => (
            <li key={d.id}>
              <a className="text-secondary hover:underline" href={`/api/admin/finance/documents/${d.id}/download`} target="_blank" rel="noreferrer">
                Download {d.original_filename}
              </a>
            </li>
          ))}
        </ul>
        {!documents.length && <p className="text-sm text-slate-500">No supporting document attached.</p>}
      </AdminSection>
      <AdminSection title="Payments">
        <table className="w-full">
          <thead><tr><FinanceTh>Date</FinanceTh><FinanceTh>Paid</FinanceTh><FinanceTh>TDS</FinanceTh><FinanceTh>Mode</FinanceTh><FinanceTh>Reference</FinanceTh><FinanceTh>Status</FinanceTh></tr></thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <FinanceTd>{p.payment_date}</FinanceTd>
                <FinanceTd>{money(p.amount_paid)}</FinanceTd>
                <FinanceTd>{money(p.tds_amount)}</FinanceTd>
                <FinanceTd>{p.payment_mode || '—'}</FinanceTd>
                <FinanceTd>{p.transaction_reference || '—'}</FinanceTd>
                <FinanceTd><StatusBadge value={p.status} /></FinanceTd>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminSection>
    </FinanceShell>
  );
}
