'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import { adminInputClass, adminSelectClass } from '@/components/admin/AdminField';
import { FinanceLink, FinanceShell, FinanceTd, FinanceTh, Pager, StatusBadge, money } from '@/components/admin/finance/FinanceUi';
import { currentFinancialYear } from '@/lib/finance/fy';

export default function InvoicesPage() {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [fy, setFy] = useState(currentFinancialYear().label);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    const params = new URLSearchParams({ page: String(page), pageSize: '25', fy });
    if (q) params.set('q', q);
    if (paymentStatus) params.set('paymentStatus', paymentStatus);
    fetch(`/api/admin/finance/invoices?${params}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Failed to load');
        setRows(body.rows || []);
        setTotal(body.total || 0);
        setError('');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, fy, paymentStatus]);

  return (
    <FinanceShell>
      <AdminPageHeader
        title="Invoices"
        description="Finalized invoices are immutable. Use View, Save As PDF, Print or Record Payment."
        action={
          <Link href="/admin/finance/invoices/new">
            <AdminButton variant="primary">New invoice</AdminButton>
          </Link>
        }
      />
      <AdminSection title="Filters">
        <div className="flex flex-wrap gap-2">
          <input className={`${adminInputClass} max-w-xs`} placeholder="Search invoice, client, PO" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
          <input className={`${adminInputClass} w-32`} value={fy} onChange={(e) => setFy(e.target.value)} placeholder="2026-27" />
          <select className={`${adminSelectClass} w-44`} value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
            <option value="">All payment statuses</option>
            <option value="unpaid">Unpaid</option>
            <option value="partially_paid">Partially paid</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
          <AdminButton onClick={load}>Search</AdminButton>
        </div>
      </AdminSection>
      {error && <p className="text-sm text-rose-700">{error}</p>}
      <AdminSection title="Invoices">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr>
                <FinanceTh>Invoice Number</FinanceTh>
                <FinanceTh>Invoice Date</FinanceTh>
                <FinanceTh>Client</FinanceTh>
                <FinanceTh>Project</FinanceTh>
                <FinanceTh>Currency</FinanceTh>
                <FinanceTh>Taxable</FinanceTh>
                <FinanceTh>Tax</FinanceTh>
                <FinanceTh>Invoice Total</FinanceTh>
                <FinanceTh>Received</FinanceTh>
                <FinanceTh>Outstanding</FinanceTh>
                <FinanceTh>Due Date</FinanceTh>
                <FinanceTh>Payment Status</FinanceTh>
                <FinanceTh>Actions</FinanceTh>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <FinanceTd>
                    <FinanceLink href={`/admin/finance/invoices/${row.id}`}>{row.invoice_number || '—'}</FinanceLink>
                  </FinanceTd>
                  <FinanceTd>{row.invoice_date}</FinanceTd>
                  <FinanceTd>{row.client_name || row.client_live_name}</FinanceTd>
                  <FinanceTd>{row.project_name || '—'}</FinanceTd>
                  <FinanceTd>{row.currency || 'INR'}</FinanceTd>
                  <FinanceTd>{money(row.taxable_amount)}</FinanceTd>
                  <FinanceTd>{money(row.tax_amount)}</FinanceTd>
                  <FinanceTd>{money(row.total_amount)}</FinanceTd>
                  <FinanceTd>{money(row.amount_received)}</FinanceTd>
                  <FinanceTd>{money(row.outstanding_amount)}</FinanceTd>
                  <FinanceTd>{row.due_date || '—'}</FinanceTd>
                  <FinanceTd>
                    <StatusBadge value={row.payment_status} />
                  </FinanceTd>
                  <FinanceTd>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                      <FinanceLink href={`/admin/finance/invoices/${row.id}`}>View</FinanceLink>
                      <a className="text-secondary hover:underline" href={`/api/admin/finance/invoices/${row.id}/pdf?download=1`}>Save As PDF</a>
                      <FinanceLink href={`/admin/finance/invoices/${row.id}/print`}>Print</FinanceLink>
                      {row.invoice_status !== 'cancelled' && Number(row.outstanding_amount) > 0 && (
                        <FinanceLink href={`/admin/finance/invoices/${row.id}#payment`}>Record Payment</FinanceLink>
                      )}
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
