'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminStatCard from '@/components/admin/AdminStatCard';
import { FinanceLink, FinanceShell, FinanceTd, FinanceTh, money } from '@/components/admin/finance/FinanceUi';

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch(`/api/admin/finance/vendors/${id}`).then((r) => r.json()).then(setData);
  }, [id]);

  const vendor = data?.vendor as Record<string, string> | undefined;
  const totals = data?.totals as { bills: number; expense: number; paid: number; outstanding: number } | undefined;
  const expenses = (data?.expenses || []) as Record<string, string>[];
  const payments = (data?.payments || []) as Record<string, string>[];

  return (
    <FinanceShell>
      <FinanceLink href="/admin/finance/vendors">Back to vendors</FinanceLink>
      <AdminPageHeader title={vendor?.vendor_name || 'Vendor'} description={[vendor?.gstin, vendor?.email, vendor?.phone].filter(Boolean).join(' · ')} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <AdminStatCard label="Bills" value={totals?.bills ?? '—'} />
        <AdminStatCard label="Receipts" value={totals ? money(totals.expense / 100) : '—'} />
        <AdminStatCard label="Paid" value={totals ? money(totals.paid / 100) : '—'} accent="green" />
        <AdminStatCard label="Outstanding" value={totals ? money(totals.outstanding / 100) : '—'} accent="amber" />
      </div>
      <AdminSection title="Vendor invoices">
        <table className="w-full">
          <thead><tr><FinanceTh>Date</FinanceTh><FinanceTh>Description</FinanceTh><FinanceTh>Total</FinanceTh><FinanceTh>Paid</FinanceTh></tr></thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id}>
                <FinanceTd><FinanceLink href={`/admin/finance/receipts/${e.id}`}>{e.expense_date}</FinanceLink></FinanceTd>
                <FinanceTd>{e.description}</FinanceTd>
                <FinanceTd>{money(e.total_amount)}</FinanceTd>
                <FinanceTd>{money(e.amount_paid)}</FinanceTd>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminSection>
      <AdminSection title="Payment history">
        <table className="w-full">
          <thead><tr><FinanceTh>Date</FinanceTh><FinanceTh>Amount</FinanceTh><FinanceTh>Reference</FinanceTh></tr></thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}><FinanceTd>{p.payment_date}</FinanceTd><FinanceTd>{money(p.amount_paid)}</FinanceTd><FinanceTd>{p.transaction_reference || '—'}</FinanceTd></tr>
            ))}
          </tbody>
        </table>
      </AdminSection>
    </FinanceShell>
  );
}
