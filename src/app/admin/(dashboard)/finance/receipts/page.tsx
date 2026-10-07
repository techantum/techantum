'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import { adminInputClass } from '@/components/admin/AdminField';
import { FinanceLink, FinanceShell, FinanceTd, FinanceTh, Pager, money } from '@/components/admin/finance/FinanceUi';

export default function ReceiptsPage() {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');

  const load = () => {
    const params = new URLSearchParams({ page: String(page), q });
    fetch(`/api/admin/finance/receipts?${params}`)
      .then((r) => r.json())
      .then((body) => {
        setRows(body.rows || []);
        setTotal(body.total || 0);
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const hasDoc = (r: Record<string, string>) => String(r.has_document) === 't' || String(r.has_document) === 'true';

  return (
    <FinanceShell>
      <AdminPageHeader
        title="Receipts"
        description="Company spending linked to a vendor. Finalized receipts can be viewed, downloaded or printed — not edited or deleted."
        action={
          <Link href="/admin/finance/receipts/new">
            <AdminButton variant="primary">Add Receipt</AdminButton>
          </Link>
        }
      />
      <AdminSection title="Receipts List">
        <div className="mb-3 flex gap-2">
          <input className={`${adminInputClass} max-w-sm`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search vendor, description, bill no, receipt ID" onKeyDown={(e) => e.key === 'Enter' && load()} />
          <AdminButton onClick={load}>Search</AdminButton>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead>
              <tr>
                <FinanceTh>Receipt ID</FinanceTh>
                <FinanceTh>Receipt Date</FinanceTh>
                <FinanceTh>Vendor</FinanceTh>
                <FinanceTh>Category</FinanceTh>
                <FinanceTh>Description</FinanceTh>
                <FinanceTh>Vendor Invoice / Bill Number</FinanceTh>
                <FinanceTh>Taxable</FinanceTh>
                <FinanceTh>GST / Tax</FinanceTh>
                <FinanceTh>Total</FinanceTh>
                <FinanceTh>Payment Mode</FinanceTh>
                <FinanceTh>Transaction Reference</FinanceTh>
                <FinanceTh>Document</FinanceTh>
                <FinanceTh>Created By</FinanceTh>
                <FinanceTh>Actions</FinanceTh>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <FinanceTd><FinanceLink href={`/admin/finance/receipts/${r.id}`}>{r.receipt_number || r.id.slice(0, 8)}</FinanceLink></FinanceTd>
                  <FinanceTd>{r.expense_date}</FinanceTd>
                  <FinanceTd>{r.vendor_name || '—'}</FinanceTd>
                  <FinanceTd>{r.category_name || '—'}</FinanceTd>
                  <FinanceTd>{r.description}</FinanceTd>
                  <FinanceTd>{r.vendor_invoice_number || '—'}</FinanceTd>
                  <FinanceTd>{money(r.taxable_amount)}</FinanceTd>
                  <FinanceTd>{money(r.tax_amount)}</FinanceTd>
                  <FinanceTd>{money(r.total_amount)}</FinanceTd>
                  <FinanceTd>{r.last_payment_mode || r.payment_mode || '—'}</FinanceTd>
                  <FinanceTd>{r.last_transaction_reference || r.transaction_reference || '—'}</FinanceTd>
                  <FinanceTd>{hasDoc(r) ? 'Attached' : 'Missing'}</FinanceTd>
                  <FinanceTd>{r.created_by_email || '—'}</FinanceTd>
                  <FinanceTd>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                      <FinanceLink href={`/admin/finance/receipts/${r.id}`}>View</FinanceLink>
                      <FinanceLink href={`/admin/finance/receipts/${r.id}/print`}>Print</FinanceLink>
                    </div>
                  </FinanceTd>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={page} pageSize={25} total={total} onPage={setPage} />
      </AdminSection>
    </FinanceShell>
  );
}
