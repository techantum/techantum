'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import { EmptyRecords, FilterBar, FilterSearch, FilterSelect, financialYearChoices, useListFilters } from '@/components/admin/ListFilters';
import DeleteInvoiceButton from '@/components/admin/finance/DeleteInvoiceButton';
import { FinanceShell, FinanceTd, FinanceTh, Pager, StatusBadge, money } from '@/components/admin/finance/FinanceUi';
import Icon from '@/components/ui/AppIcon';
import { currentFinancialYear } from '@/lib/finance/fy';

const initialFilters = {
  q: '',
  fy: currentFinancialYear().label,
  paymentStatus: '',
};

export default function InvoicesPage() {
  const filters = useListFilters(initialFilters);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const { q, fy, paymentStatus, page } = filters.applied;
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
  }, [filters.applied]);

  return (
    <FinanceShell>
      <AdminPageHeader
        title="Invoices"
        description="View, download, print, record a payment, or delete an invoice after typing its number."
        action={
          <Link href="/admin/finance/invoices/new">
            <AdminButton variant="primary">New invoice</AdminButton>
          </Link>
        }
      />
      <FilterBar onSearch={filters.search} onClear={filters.clear}>
        <FilterSearch
          value={filters.draft.q}
          onChange={(value) => filters.set('q', value)}
          placeholder="Search invoice, client, PO..."
        />
        <FilterSelect icon="CalendarDaysIcon" value={filters.draft.fy} onChange={(value) => filters.set('fy', value)} className="w-40">
          {financialYearChoices(filters.draft.fy).map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect value={filters.draft.paymentStatus} onChange={(value) => filters.set('paymentStatus', value)} className="w-56">
          <option value="">All payment statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="partially_paid">Partially paid</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </FilterSelect>
      </FilterBar>
      {error && <p className="text-sm text-rose-700">{error}</p>}
      <AdminSection title="Invoices">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr>
                <FinanceTh>Invoice</FinanceTh>
                <FinanceTh>Date</FinanceTh>
                <FinanceTh>Client</FinanceTh>
                <FinanceTh>Total</FinanceTh>
                <FinanceTh>Status</FinanceTh>
                <FinanceTh>Actions</FinanceTh>
              </tr>
            </thead>
            {rows.length > 0 && (
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <FinanceTd><span className="font-semibold text-slate-900">{row.invoice_number || '—'}</span></FinanceTd>
                    <FinanceTd>{String(row.invoice_date || '').slice(0, 10)}</FinanceTd>
                    <FinanceTd>{row.client_name || row.client_live_name}</FinanceTd>
                    <FinanceTd>{money(row.total_amount)}</FinanceTd>
                    <FinanceTd><StatusBadge value={row.payment_status} /></FinanceTd>
                    <FinanceTd>
                      <div className="flex items-center gap-1">
                        <Link href={`/admin/finance/invoices/${row.id}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="View invoice"><Icon name="EyeIcon" size={16} /></Link>
                        <a className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" href={`/api/admin/finance/invoices/${row.id}/pdf?download=1`} aria-label="Download PDF"><Icon name="ArrowDownTrayIcon" size={16} /></a>
                        <Link href={`/admin/finance/invoices/${row.id}/print`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Print invoice"><Icon name="PrinterIcon" size={16} /></Link>
                        <DeleteInvoiceButton id={row.id} invoiceNumber={row.invoice_number} onDeleted={filters.reload} label="" />
                      </div>
                    </FinanceTd>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        {rows.length === 0 && !error && (
          <EmptyRecords
            title="No invoices found"
            description="Try adjusting your filters or create a new invoice."
            action={
              <Link href="/admin/finance/invoices/new">
                <AdminButton variant="primary">New invoice</AdminButton>
              </Link>
            }
          />
        )}
        <Pager page={filters.applied.page} pageSize={25} total={total} onPage={filters.setPage} />
      </AdminSection>
    </FinanceShell>
  );
}
