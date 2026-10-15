'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import { EmptyRecords, FilterBar, FilterSearch, FilterSelect, useListFilters } from '@/components/admin/ListFilters';
import { FinanceShell, FinanceTd, FinanceTh, Pager, TypePill, money } from '@/components/admin/finance/FinanceUi';

const transactionFilters = { q: '', type: '' };

export default function TransactionsPage() {
  const filters = useListFilters(transactionFilters);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(filters.applied.page) });
    if (filters.applied.type) params.set('type', filters.applied.type);
    if (filters.applied.q) params.set('q', filters.applied.q);
    fetch(`/api/admin/finance/transactions?${params}`).then((r) => r.json()).then((b) => {
      setRows(b.rows || []);
      setTotal(b.total || 0);
    });
  }, [filters.applied]);

  return (
    <FinanceShell>
      <AdminPageHeader title="Transactions" description="Money in from invoice payments. Money out from receipts. Created automatically — do not enter duplicates." />
      <FilterBar onSearch={filters.search} onClear={filters.clear}>
        <FilterSearch value={filters.draft.q} onChange={(value) => filters.set('q', value)} placeholder="Search description or reference..." />
        <FilterSelect value={filters.draft.type} onChange={(value) => filters.set('type', value)}>
          <option value="">All types</option>
          {['invoice_payment', 'receipt_payment', 'salary_payment', 'refund', 'other'].map((type) => (
            <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
          ))}
        </FilterSelect>
      </FilterBar>
      <AdminSection title="Register">
        <table className="w-full">
          <thead><tr><FinanceTh>Date</FinanceTh><FinanceTh>Type</FinanceTh><FinanceTh>Party</FinanceTh><FinanceTh>Amount</FinanceTh><FinanceTh>Mode</FinanceTh></tr></thead>
          {rows.length > 0 && (
          <tbody>
            {rows.map((r) => {
              const inbound = Number(r.money_in) > 0;
              return (
              <tr key={r.id}>
                <FinanceTd>{String(r.transaction_date || '').slice(0, 10)}</FinanceTd>
                <FinanceTd><TypePill>{r.transaction_type.replace(/_/g, ' ')}</TypePill></FinanceTd>
                <FinanceTd>
                  <p className="font-semibold text-slate-900">{r.party_name || '—'}</p>
                  <p className="text-xs text-slate-400">{r.description}</p>
                </FinanceTd>
                <FinanceTd><span className={inbound ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>{inbound ? money(r.money_in) : money(r.money_out)}</span></FinanceTd>
                <FinanceTd>{r.payment_mode || '—'}</FinanceTd>
              </tr>
              );
            })}
          </tbody>
          )}
        </table>
        {rows.length === 0 && <EmptyRecords title="No transactions found" description="Try adjusting your filters. Transactions are created from invoice payments and receipts." />}
        <Pager page={filters.applied.page} pageSize={25} total={total} onPage={filters.setPage} />
      </AdminSection>
    </FinanceShell>
  );
}
