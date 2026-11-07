'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import { EmptyRecords, FilterBar, FilterSearch, FilterSelect, useListFilters } from '@/components/admin/ListFilters';
import Icon from '@/components/ui/AppIcon';
import { FinanceShell, FinanceTd, FinanceTh, Pager, TypePill, money } from '@/components/admin/finance/FinanceUi';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const PAGE_SIZE = 20;

export type TransactionsTab = 'ledger' | 'expenses' | 'income' | 'sridhar';

const TABS: { id: TransactionsTab; label: string; href: string }[] = [
  { id: 'ledger', label: 'All Transactions', href: '/admin/finance/transactions' },
  { id: 'expenses', label: 'Expenses', href: '/admin/finance/transactions/expenses' },
  { id: 'income', label: 'Income', href: '/admin/finance/transactions/income' },
  { id: 'sridhar', label: 'Sridhar Investment', href: '/admin/finance/transactions/sridhar' },
];

function tabFromPath(pathname: string): TransactionsTab {
  if (pathname.includes('/transactions/expenses')) return 'expenses';
  if (pathname.includes('/transactions/income')) return 'income';
  if (pathname.includes('/transactions/sridhar')) return 'sridhar';
  return 'ledger';
}

function PeriodFilters({
  year,
  month,
  onYear,
  onMonth,
  children,
}: {
  year: number | '';
  month: number | '';
  onYear: (value: number | '') => void;
  onMonth: (value: number | '') => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <select
        className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
        value={month === '' ? '' : String(month)}
        onChange={(event) => {
          const value = event.target.value;
          onMonth(value ? Number(value) : '');
          if (value && !year) onYear(Number(today.slice(0, 4)));
        }}
      >
        <option value="">All months</option>
        {MONTHS.map((name, index) => (
          <option key={name} value={index + 1}>
            {name}
          </option>
        ))}
      </select>
      <input
        className="h-10 w-28 rounded-xl border border-slate-200 px-3 text-sm"
        placeholder="Year"
        value={year}
        onChange={(event) => {
          const value = event.target.value.trim();
          onYear(value ? Number(value) || '' : '');
        }}
      />
      {children}
    </div>
  );
}

function ExportLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="btn-secondary inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold"
    >
      <Icon name="ArrowDownTrayIcon" size={16} />
      Export Excel
    </a>
  );
}

function LedgerPanel() {
  const filters = useListFilters({ q: '', type: '' });
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(filters.applied.page), pageSize: String(PAGE_SIZE) });
    if (filters.applied.type) params.set('type', filters.applied.type);
    if (filters.applied.q) params.set('q', filters.applied.q);
    fetch(`/api/admin/finance/transactions?${params}`)
      .then((r) => r.json())
      .then((b) => {
        setRows(b.rows || []);
        setTotal(b.total || 0);
      });
  }, [filters.applied]);

  return (
    <>
      <FilterBar onSearch={filters.search} onClear={filters.clear}>
        <FilterSearch value={filters.draft.q} onChange={(value) => filters.set('q', value)} placeholder="Search description or reference..." />
        <FilterSelect value={filters.draft.type} onChange={(value) => filters.set('type', value)}>
          <option value="">All types</option>
          {['invoice_payment', 'receipt_payment', 'salary_payment', 'refund', 'other'].map((type) => (
            <option key={type} value={type}>
              {type.replace(/_/g, ' ')}
            </option>
          ))}
        </FilterSelect>
      </FilterBar>
      <AdminSection title="Register">
        <table className="w-full">
          <thead>
            <tr>
              <FinanceTh>Date</FinanceTh>
              <FinanceTh>Type</FinanceTh>
              <FinanceTh>Party</FinanceTh>
              <FinanceTh>Amount</FinanceTh>
              <FinanceTh>Mode</FinanceTh>
            </tr>
          </thead>
          {rows.length > 0 && (
            <tbody>
              {rows.map((r) => {
                const inbound = Number(r.money_in) > 0;
                return (
                  <tr key={r.id}>
                    <FinanceTd>{String(r.transaction_date || '').slice(0, 10)}</FinanceTd>
                    <FinanceTd>
                      <TypePill>{r.transaction_type.replace(/_/g, ' ')}</TypePill>
                    </FinanceTd>
                    <FinanceTd>
                      <p className="font-semibold text-slate-900">{r.party_name || '—'}</p>
                      <p className="text-xs text-slate-400">{r.description}</p>
                    </FinanceTd>
                    <FinanceTd>
                      <span className={inbound ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>
                        {inbound ? money(r.money_in) : money(r.money_out)}
                      </span>
                    </FinanceTd>
                    <FinanceTd>{r.payment_mode || '—'}</FinanceTd>
                  </tr>
                );
              })}
            </tbody>
          )}
        </table>
        {rows.length === 0 && (
          <EmptyRecords title="No transactions found" description="Try adjusting your filters. Transactions are created from invoice payments and receipts." />
        )}
        <Pager page={filters.applied.page} pageSize={PAGE_SIZE} total={total} onPage={filters.setPage} />
      </AdminSection>
    </>
  );
}

function ExpensesPanel() {
  const [year, setYear] = useState<number | ''>('');
  const [month, setMonth] = useState<number | ''>('');
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('');
  const [error, setError] = useState('');

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (year) params.set('year', String(year));
    if (month) params.set('month', String(month));
    if (query.trim()) params.set('q', query.trim());
    if (source) params.set('source', source);
    const qs = params.toString();
    return `/api/admin/finance/expense-register/export${qs ? `?${qs}` : ''}`;
  }, [year, month, query, source]);

  const load = async () => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (year) params.set('year', String(year));
    if (month) params.set('month', String(month));
    if (query.trim()) params.set('q', query.trim());
    if (source) params.set('source', source);
    const response = await fetch(`/api/admin/finance/expense-register?${params}`);
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || 'Could not load expenses');
      return;
    }
    setError('');
    setRows(body.rows || []);
    setTotal(body.total || 0);
    setTotalAmount(Number(body.totalAmount || 0));
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, page, source]);

  const periodLabel = year && month ? `${MONTHS[Number(month) - 1]} ${year}` : year ? `Year ${year}` : 'All periods';

  return (
    <>
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Records</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Filtered total</p>
          <p className="mt-2 text-2xl font-semibold text-rose-600">{money(totalAmount)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Period</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{periodLabel}</p>
        </div>
      </div>
      <PeriodFilters
        year={year}
        month={month}
        onYear={(value) => {
          setYear(value);
          setPage(1);
        }}
        onMonth={(value) => {
          setMonth(value);
          setPage(1);
        }}
      >
        <select
          className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
          value={source}
          onChange={(event) => {
            setSource(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All sources</option>
          <option value="bank_statement">Bank statement</option>
          <option value="manual">Manual / receipts</option>
        </select>
        <label className="relative min-w-[240px] flex-1">
          <Icon name="MagnifyingGlassIcon" className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} />
          <input
            className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm"
            placeholder="Search expenses..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && (setPage(1), void load())}
          />
        </label>
        <AdminButton
          onClick={() => {
            setPage(1);
            void load();
          }}
        >
          Search
        </AdminButton>
        <ExportLink href={exportHref} />
      </PeriodFilters>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3">Date</th>
              <th className="px-3 py-3">Description</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">Vendor</th>
              <th className="px-3 py-3">Source</th>
              <th className="px-3 py-3">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{String(row.expense_date || '').slice(0, 10)}</td>
                <td className="px-3 py-3">
                  <p className="font-medium text-slate-900">{row.description}</p>
                  {row.transaction_reference ? <p className="text-xs text-slate-400">{row.transaction_reference}</p> : null}
                </td>
                <td className="px-3 py-3">{row.category_name || '—'}</td>
                <td className="px-3 py-3">{row.vendor_name || '—'}</td>
                <td className="px-3 py-3 capitalize">{String(row.source || 'manual').replace(/_/g, ' ')}</td>
                <td className="px-3 py-3 font-semibold text-rose-600">{money(row.total_amount)}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                  No expenses for this filter. Import a bank statement or record a receipt.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <div className="px-4 pb-4">
          <Pager page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
        </div>
      </section>
    </>
  );
}

function IncomePanel() {
  const [year, setYear] = useState<number | ''>('');
  const [month, setMonth] = useState<number | ''>('');
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (year) params.set('year', String(year));
    if (month) params.set('month', String(month));
    if (query.trim()) params.set('q', query.trim());
    const qs = params.toString();
    return `/api/admin/finance/income/export${qs ? `?${qs}` : ''}`;
  }, [year, month, query]);

  const load = async () => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (year) params.set('year', String(year));
    if (month) params.set('month', String(month));
    if (query.trim()) params.set('q', query.trim());
    const response = await fetch(`/api/admin/finance/income?${params}`);
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || 'Could not load income');
      return;
    }
    setError('');
    setRows(body.rows || []);
    setTotal(body.total || 0);
    setTotalAmount(Number(body.totalAmount || 0));
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, page]);

  const periodLabel = year && month ? `${MONTHS[Number(month) - 1]} ${year}` : year ? `Year ${year}` : 'All periods';

  return (
    <>
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Records</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Filtered total</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">{money(totalAmount)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Period</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{periodLabel}</p>
        </div>
      </div>
      <PeriodFilters
        year={year}
        month={month}
        onYear={(value) => {
          setYear(value);
          setPage(1);
        }}
        onMonth={(value) => {
          setMonth(value);
          setPage(1);
        }}
      >
        <label className="relative min-w-[240px] flex-1">
          <Icon name="MagnifyingGlassIcon" className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} />
          <input
            className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm"
            placeholder="Search income..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && (setPage(1), void load())}
          />
        </label>
        <AdminButton
          onClick={() => {
            setPage(1);
            void load();
          }}
        >
          Search
        </AdminButton>
        <ExportLink href={exportHref} />
      </PeriodFilters>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3">Date</th>
              <th className="px-3 py-3">Description</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">Source</th>
              <th className="px-3 py-3">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{String(row.income_date || '').slice(0, 10)}</td>
                <td className="px-3 py-3">
                  <p className="font-medium text-slate-900">{row.description || '—'}</p>
                  {row.transaction_reference ? <p className="text-xs text-slate-400">{row.transaction_reference}</p> : null}
                </td>
                <td className="px-3 py-3">{row.category_name || '—'}</td>
                <td className="px-3 py-3 capitalize">{String(row.source || 'manual').replace(/_/g, ' ')}</td>
                <td className="px-3 py-3 font-semibold text-emerald-600">{money(row.net_received || row.gross_amount)}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500">
                  No income records for this filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <div className="px-4 pb-4">
          <Pager page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
        </div>
      </section>
    </>
  );
}

function sridharKindLabel(kind: string) {
  if (kind === 'loan') return 'Loan';
  if (kind === 'investment') return 'Investment';
  if (kind === 'funding') return 'Funding';
  if (kind === 'payment') return 'Payment';
  return 'Other';
}

function sridharKindClass(kind: string) {
  if (kind === 'loan') return 'bg-violet-50 text-violet-700';
  if (kind === 'investment') return 'bg-sky-50 text-sky-700';
  if (kind === 'funding') return 'bg-indigo-50 text-indigo-700';
  if (kind === 'payment') return 'bg-slate-100 text-slate-700';
  return 'bg-amber-50 text-amber-700';
}

function SridharPanel() {
  const [year, setYear] = useState<number | ''>('');
  const [month, setMonth] = useState<number | ''>('');
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [total, setTotal] = useState(0);
  const [totalIn, setTotalIn] = useState(0);
  const [totalOut, setTotalOut] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [direction, setDirection] = useState('');
  const [kind, setKind] = useState('');
  const [error, setError] = useState('');

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (year) params.set('year', String(year));
    if (month) params.set('month', String(month));
    if (query.trim()) params.set('q', query.trim());
    if (direction) params.set('direction', direction);
    if (kind) params.set('kind', kind);
    const qs = params.toString();
    return `/api/admin/finance/sridhar-funding/export${qs ? `?${qs}` : ''}`;
  }, [year, month, query, direction, kind]);

  const load = async () => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (year) params.set('year', String(year));
    if (month) params.set('month', String(month));
    if (query.trim()) params.set('q', query.trim());
    if (direction) params.set('direction', direction);
    if (kind) params.set('kind', kind);
    const response = await fetch(`/api/admin/finance/sridhar-funding?${params}`);
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || 'Could not load Sridhar investment');
      return;
    }
    setError('');
    setRows(body.rows || []);
    setTotal(body.total || 0);
    setTotalIn(Number(body.totalIn || 0));
    setTotalOut(Number(body.totalOut || 0));
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, page, direction, kind]);

  return (
    <>
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Records</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Investment In</p>
          <p className="mt-2 text-2xl font-semibold text-teal-600">{money(totalIn)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Investment Out</p>
          <p className="mt-2 text-2xl font-semibold text-orange-600">{money(totalOut)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Net</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{money(totalIn - totalOut)}</p>
        </div>
      </div>
      <PeriodFilters
        year={year}
        month={month}
        onYear={(value) => {
          setYear(value);
          setPage(1);
        }}
        onMonth={(value) => {
          setMonth(value);
          setPage(1);
        }}
      >
        <select
          className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
          value={kind}
          onChange={(event) => {
            setKind(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All types</option>
          <option value="loan">Loan</option>
          <option value="investment">Investment</option>
          <option value="payment">Payment</option>
          <option value="funding">Funding</option>
          <option value="other">Other</option>
        </select>
        <select
          className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
          value={direction}
          onChange={(event) => {
            setDirection(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All directions</option>
          <option value="credit">Credit (In)</option>
          <option value="debit">Debit (Out)</option>
        </select>
        <label className="relative min-w-[240px] flex-1">
          <Icon name="MagnifyingGlassIcon" className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} />
          <input
            className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm"
            placeholder="Search loan, investment, payment..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && (setPage(1), void load())}
          />
        </label>
        <AdminButton
          onClick={() => {
            setPage(1);
            void load();
          }}
        >
          Search
        </AdminButton>
        <ExportLink href={exportHref} />
      </PeriodFilters>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3">Date</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Description</th>
              <th className="px-3 py-3">Direction</th>
              <th className="px-3 py-3">Reference</th>
              <th className="px-3 py-3">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const fundingKind = String(row.funding_kind || 'other');
              return (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{String(row.txn_date || '').slice(0, 10)}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${sridharKindClass(fundingKind)}`}>
                      {sridharKindLabel(fundingKind)}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-900">{row.description}</td>
                  <td className="px-3 py-3">
                    {row.direction === 'credit' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
                        <Icon name="ArrowDownTrayIcon" size={14} /> In
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
                        <Icon name="ArrowUpTrayIcon" size={14} /> Out
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-500">{row.reference || '—'}</td>
                  <td className={`px-3 py-3 font-semibold ${row.direction === 'credit' ? 'text-teal-600' : 'text-orange-600'}`}>{money(row.amount)}</td>
                </tr>
              );
            })}
            {!rows.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                  No Sridhar investment rows for this filter. Narrations with Loan, Investment, Payment, or Funding under Sridhar appear here.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <div className="px-4 pb-4">
          <Pager page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
        </div>
      </section>
    </>
  );
}

const TAB_META: Record<TransactionsTab, { title: string; description: string }> = {
  ledger: {
    title: 'Transactions',
    description: 'Money in from invoice payments. Money out from receipts. Created automatically — do not enter duplicates.',
  },
  expenses: {
    title: 'Expenses',
    description: 'All expenses by default. Filter by month or source when needed. Bank debits reconcile with receipts to avoid duplicates.',
  },
  income: {
    title: 'Income',
    description: 'All income by default. Filter by month when needed. Credits come from bank statements and reconciled invoice payments.',
  },
  sridhar: {
    title: 'Sridhar Investment',
    description: 'Fetched from bank narrations — Loan, Investment, Payment, Funding (and truncated UPI text like Investme/Paymen). Filter by type or month when needed.',
  },
};

export default function TransactionsHub({ initialTab }: { initialTab?: TransactionsTab }) {
  const pathname = usePathname() || '';
  const tab = initialTab || tabFromPath(pathname);
  const meta = TAB_META[tab];

  return (
    <FinanceShell>
      <div className="text-xs font-medium text-slate-400">
        Finance Management <span className="mx-1.5 text-slate-300">/</span> Transactions
        {tab !== 'ledger' ? (
          <>
            <span className="mx-1.5 text-slate-300">/</span>
            <span className="text-slate-600">{meta.title}</span>
          </>
        ) : null}
      </div>
      <AdminPageHeader
        title={meta.title}
        description={meta.description}
        action={
          tab !== 'ledger' ? (
            <Link href="/admin/finance/bank-statements">
              <AdminButton variant="primary">Import from Bank Statement</AdminButton>
            </Link>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {TABS.map((item) => {
          const active = item.id === tab;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                active ? 'bg-secondary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-secondary'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {tab === 'ledger' ? <LedgerPanel /> : null}
      {tab === 'expenses' ? <ExpensesPanel /> : null}
      {tab === 'income' ? <IncomePanel /> : null}
      {tab === 'sridhar' ? <SridharPanel /> : null}
    </FinanceShell>
  );
}
