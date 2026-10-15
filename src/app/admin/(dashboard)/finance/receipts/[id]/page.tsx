'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminStatCard from '@/components/admin/AdminStatCard';
import { AdminBackLink, Fact, FactGrid, SectionEmpty } from '@/components/admin/DetailFacts';
import { FinanceShell, FinanceTd, FinanceTh, StatusBadge, money } from '@/components/admin/finance/FinanceUi';
import Icon from '@/components/ui/AppIcon';

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
      <AdminBackLink href="/admin/finance/receipts">Back to receipts</AdminBackLink>
      <AdminPageHeader
        title={receipt?.receipt_number || 'Receipt'}
        description={receipt ? `${receipt.vendor_name} • ${receipt.description}` : ''}
        action={
          <div className="flex gap-2 print:hidden">
            <a href={`/admin/finance/receipts/${id}/print`}><AdminButton><Icon name="PrinterIcon" size={16} />Print</AdminButton></a>
          </div>
        }
      />
      {error && <AdminAlert variant="error">{error}</AdminAlert>}
      {receipt && (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <AdminStatCard label="Total" value={money(receipt.total_amount)} accent="blue" icon="DocumentTextIcon" />
            <AdminStatCard label="Tax" value={money(tax)} icon="ReceiptPercentIcon" />
            <AdminStatCard label="Paid" value={money(receipt.amount_paid)} accent="green" icon="CurrencyRupeeIcon" />
            <AdminStatCard label="Status" value={<StatusBadge value={receipt.payment_status} />} accent={receipt.payment_status === 'paid' ? 'green' : 'amber'} icon="CheckCircleIcon" />
          </div>
          <AdminSection title="Receipt details" icon="DocumentTextIcon">
            <FactGrid cols={4}>
              <Fact icon="CalendarDaysIcon" label="Date">{receipt.expense_date}</Fact>
              <Fact icon="BuildingStorefrontIcon" label="Vendor">{receipt.vendor_name}</Fact>
              <Fact icon="TagIcon" label="Category">{receipt.category_name || '—'}</Fact>
              <Fact icon="DocumentTextIcon" label="Vendor bill">{receipt.vendor_invoice_number || '—'}</Fact>
              <Fact icon="BanknotesIcon" label="Taxable">{money(receipt.taxable_amount)}</Fact>
              <Fact icon="ReceiptPercentIcon" label="GST / Tax">{money(tax)}</Fact>
              <Fact icon="CreditCardIcon" label="Mode">{receipt.payment_mode || '—'}</Fact>
              <Fact icon="HashtagIcon" label="Reference">{receipt.transaction_reference || '—'}</Fact>
              <Fact icon="UserIcon" label="Created by">{receipt.created_by_email || '—'}</Fact>
            </FactGrid>
          </AdminSection>
        </>
      )}
      <AdminSection title="Supporting documents" icon="PaperClipIcon">
        <ul className="space-y-1 text-sm">
          {documents.map((d) => (
            <li key={d.id}>
              <a className="text-secondary hover:underline" href={`/api/admin/finance/documents/${d.id}/download`} target="_blank" rel="noreferrer">
                Download {d.original_filename}
              </a>
            </li>
          ))}
        </ul>
        {!documents.length && <SectionEmpty icon="PaperClipIcon" title="No documents yet" description="Supporting files attached to this receipt will appear here." />}
      </AdminSection>
      <AdminSection title="Payments" icon="CreditCardIcon">
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
