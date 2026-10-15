'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import { EmptyRecords, FilterBar, FilterSearch, useListFilters } from '@/components/admin/ListFilters';
import { FinanceShell, FinanceTd, FinanceTh, Pager, TypePill, money } from '@/components/admin/finance/FinanceUi';
import Icon from '@/components/ui/AppIcon';

const receiptFilters = { q: '' };

export default function ReceiptsPage() {
  const filters = useListFilters(receiptFilters);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(filters.applied.page), q: filters.applied.q });
    fetch(`/api/admin/finance/receipts?${params}`)
      .then((r) => r.json())
      .then((body) => {
        setRows(body.rows || []);
        setTotal(body.total || 0);
      });
  }, [filters.applied]);

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
      <FilterBar onSearch={filters.search} onClear={filters.clear}>
        <FilterSearch value={filters.draft.q} onChange={(value) => filters.set('q', value)} placeholder="Search vendor, description, bill no, receipt ID..." />
      </FilterBar>
      <AdminSection title="Receipts List">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr>
                <FinanceTh>Receipt</FinanceTh>
                <FinanceTh>Date</FinanceTh>
                <FinanceTh>Vendor</FinanceTh>
                <FinanceTh>Category</FinanceTh>
                <FinanceTh>Total</FinanceTh>
                <FinanceTh>Document</FinanceTh>
                <FinanceTh>Actions</FinanceTh>
              </tr>
            </thead>
            {rows.length > 0 && (
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <FinanceTd><span className="font-semibold text-slate-900">{r.receipt_number || r.id.slice(0, 8)}</span></FinanceTd>
                  <FinanceTd>{String(r.expense_date || '').slice(0, 10)}</FinanceTd>
                  <FinanceTd>{r.vendor_name || '—'}</FinanceTd>
                  <FinanceTd><TypePill>{r.category_name || '—'}</TypePill></FinanceTd>
                  <FinanceTd>{money(r.total_amount)}</FinanceTd>
                  <FinanceTd><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${hasDoc(r) ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-700'}`}>{hasDoc(r) ? 'Attached' : 'Missing'}</span></FinanceTd>
                  <FinanceTd>
                    <div className="flex items-center gap-1">
                      <Link href={`/admin/finance/receipts/${r.id}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="View receipt"><Icon name="EyeIcon" size={16} /></Link>
                      <Link href={`/admin/finance/receipts/${r.id}/print`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Print receipt"><Icon name="PrinterIcon" size={16} /></Link>
                    </div>
                  </FinanceTd>
                </tr>
              ))}
            </tbody>
            )}
          </table>
        </div>
        {rows.length === 0 && (
          <EmptyRecords title="No receipts found" description="Try adjusting your filters or add a receipt." action={<Link href="/admin/finance/receipts/new"><AdminButton variant="primary">Add Receipt</AdminButton></Link>} />
        )}
        <Pager page={filters.applied.page} pageSize={25} total={total} onPage={filters.setPage} />
      </AdminSection>
    </FinanceShell>
  );
}
