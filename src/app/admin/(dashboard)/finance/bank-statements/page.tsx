'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatusModal from '@/components/admin/AdminStatusModal';
import Icon from '@/components/ui/AppIcon';
import { FinanceShell, money } from '@/components/admin/finance/FinanceUi';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

type Summary = {
  totalCredits: number;
  totalDebits: number;
  netBalance: number;
  sridharIn: number;
  sridharOut: number;
  incomeCount: number;
  expenseCount: number;
  sridharCount: number;
  totalCount: number;
  periodLabel: string;
};

type Line = Record<string, string> & {
  id: string;
  txn_date: string;
  description: string;
  category_label?: string;
  source_module: string;
  direction: string;
  amount: string;
  status: string;
  reference?: string;
  party_name?: string;
  service_name?: string;
};

type Provider = { partyName: string; partyId: string | null; partyType: string | null; count: number };

function stamp(value: string) {
  const match = String(value || '').match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value || '—';
  return `${match[3]} ${SHORT[Number(match[2]) - 1]} ${match[1]}`;
}

export default function BankStatementsPage() {
  const [year, setYear] = useState<number | ''>('');
  const [month, setMonth] = useState<number | ''>('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<Line[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const PAGE_SIZE = 20;
  const [tab, setTab] = useState<'all' | 'income' | 'expense' | 'sridhar'>('all');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [provider, setProvider] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importMonth, setImportMonth] = useState(Number(today.slice(5, 7)));
  const [importYear, setImportYear] = useState(Number(today.slice(0, 4)));
  const [fillMissing, setFillMissing] = useState(false);
  const [statusModal, setStatusModal] = useState<{ title: string; message: string; variant: 'success' | 'error' } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const buildParams = (nextYear = year, nextMonth = month, nextPage = page) => {
    const params = new URLSearchParams({
      page: String(nextPage),
      pageSize: String(PAGE_SIZE),
    });
    if (nextYear) params.set('year', String(nextYear));
    if (nextMonth) params.set('month', String(nextMonth));
    if (tab !== 'all') params.set('module', tab);
    if (query.trim()) params.set('q', query.trim());
    if (type) params.set('type', type);
    if (category) params.set('category', category);
    if (provider) params.set('partyName', provider);
    return params;
  };

  const load = async (nextYear = year, nextMonth = month, nextPage = page) => {
    setError('');
    const params = buildParams(nextYear, nextMonth, nextPage);
    const summaryParams = new URLSearchParams();
    if (nextYear) summaryParams.set('year', String(nextYear));
    if (nextMonth) summaryParams.set('month', String(nextMonth));
    if (tab !== 'all') summaryParams.set('module', tab);
    if (query.trim()) summaryParams.set('q', query.trim());
    if (type) summaryParams.set('type', type);
    if (category) summaryParams.set('category', category);
    if (provider) summaryParams.set('partyName', provider);

    const providerParams = new URLSearchParams();
    if (nextYear) providerParams.set('year', String(nextYear));
    if (nextMonth) providerParams.set('month', String(nextMonth));
    if (tab !== 'all') providerParams.set('module', tab);

    const [summaryRes, linesRes, providersRes] = await Promise.all([
      fetch(`/api/admin/finance/bank-statements/summary?${summaryParams}`),
      fetch(`/api/admin/finance/bank-statements/lines?${params}`),
      fetch(`/api/admin/finance/bank-statements/providers?${providerParams}`),
    ]);
    const summaryBody = await summaryRes.json();
    const linesBody = await linesRes.json();
    const providersBody = await providersRes.json();
    if (!summaryRes.ok) {
      setError(summaryBody.error || 'Could not load summary');
      return;
    }
    if (!linesRes.ok) {
      setError(linesBody.error || 'Could not load transactions');
      return;
    }
    setSummary(summaryBody);
    setRows(linesBody.rows || []);
    setTotal(linesBody.total || 0);
    setCategoryOptions(Array.isArray(linesBody.categories) ? linesBody.categories : []);
    setProviders(Array.isArray(providersBody) ? providersBody : []);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, page, tab, type, category, provider]);

  const categories = categoryOptions.length
    ? categoryOptions
    : [...new Set(rows.map((row) => row.category_label).filter(Boolean))].sort();
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageWindowSize = 5;
  const pageWindowStart = Math.max(1, Math.min(page - Math.floor(pageWindowSize / 2), pages - pageWindowSize + 1));
  const pageWindowEnd = Math.min(pages, pageWindowStart + pageWindowSize - 1);
  const pageNumbers = Array.from({ length: Math.max(0, pageWindowEnd - pageWindowStart + 1) }, (_, index) => pageWindowStart + index);
  const yearOptions = Array.from({ length: 7 }, (_, index) => Number(today.slice(0, 4)) - 3 + index);
  const periodLabel = year && month ? `${MONTHS[Number(month) - 1]} ${year}` : year ? `Year ${year}` : 'All periods';

  const move = (delta: number) => {
    if (!year || !month) {
      const y = Number(today.slice(0, 4));
      const m = Number(today.slice(5, 7));
      const index = y * 12 + (m - 1) + delta;
      setYear(Math.floor(index / 12));
      setMonth((index % 12) + 1);
      setPage(1);
      return;
    }
    const index = Number(year) * 12 + (Number(month) - 1) + delta;
    setYear(Math.floor(index / 12));
    setMonth((index % 12) + 1);
    setPage(1);
  };

  const exportHref = `/api/admin/finance/bank-statements/export?${buildParams(year, month, 1).toString()}`;

  const importFile = async (file: File) => {
    setBusy(true);
    setError('');
    const data = new FormData();
    data.set('file', file);
    data.set('month', String(importMonth));
    data.set('year', String(importYear));
    data.set('mode', fillMissing ? 'fill_missing' : 'strict');
    const response = await fetch('/api/admin/finance/bank-statements/import', { method: 'POST', body: data });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) {
      const message = body.error || 'Could not import statement';
      setError(message);
      setStatusModal({ title: 'Import failed', message, variant: 'error' });
      return;
    }
    setImportOpen(false);
    setYear(importYear);
    setMonth(importMonth);
    setPage(1);
    const salaryNote = body.salaryCount ? ` Salary payments detected: ${body.salaryCount}.` : '';
    const reconcileNote = body.reconciledCount
      ? ` Reconciled ${body.reconciledCount} with existing invoice/receipt rows (no duplicates).`
      : '';
    setStatusModal({
      title: fillMissing ? 'Missing transactions added' : 'Statement imported',
      message: `Posted ${body.posted} transaction${body.posted === 1 ? '' : 's'} into Income (${body.incomeCount}), Expenses (${body.expenseCount}), and Sridhar Investment (${body.sridharCount}).${salaryNote}${reconcileNote}${body.duplicates ? ` Skipped ${body.duplicates} duplicate${body.duplicates === 1 ? '' : 's'}.` : ''}`,
      variant: 'success',
    });
    await load(importYear, importMonth, 1);
  };

  const moduleTone = (module: string) => {
    if (module === 'income') return 'bg-emerald-50 text-emerald-700';
    if (module === 'expense') return 'bg-rose-50 text-rose-700';
    return 'bg-sky-50 text-sky-700';
  };

  return (
    <FinanceShell>
      <div className="text-xs font-medium text-slate-400">
        Finance Management <span className="mx-1.5 text-slate-300">/</span> <span className="text-slate-600">Bank Statements</span>
      </div>

      <AdminPageHeader
        title="Bank Statements"
        description="Overview shows all imported transactions. Use filters to narrow by period or service provider. Import reconciles with invoices and receipts without duplicates."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white">
              <button type="button" className="flex h-11 w-10 items-center justify-center text-slate-500 hover:bg-slate-50" onClick={() => move(-1)} aria-label="Previous month">
                <Icon name="ChevronLeftIcon" size={18} />
              </button>
              <span className="min-w-[148px] px-2 text-center text-sm font-semibold text-slate-800">{periodLabel}</span>
              <button type="button" className="flex h-11 w-10 items-center justify-center text-slate-500 hover:bg-slate-50" onClick={() => move(1)} aria-label="Next month">
                <Icon name="ChevronRightIcon" size={18} />
              </button>
            </div>
            <a
              className="inline-flex h-11 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-secondary/40"
              href={exportHref}
            >
              Download Report
            </a>
            <AdminButton
              variant="primary"
              onClick={() => {
                setImportMonth(typeof month === 'number' ? month : Number(today.slice(5, 7)));
                setImportYear(typeof year === 'number' ? year : Number(today.slice(0, 4)));
                setImportOpen(true);
              }}
            >
              Import Statement
            </AdminButton>
          </div>
        }
      />

      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Total Credits / Income', money(summary?.totalCredits), 'text-emerald-600', 'ArrowTrendingUpIcon', 'bg-emerald-50 text-emerald-600'],
          ['Total Debits / Expenses', money(summary?.totalDebits), 'text-rose-600', 'ArrowTrendingDownIcon', 'bg-rose-50 text-rose-600'],
          ['Net Balance', money(summary?.netBalance), 'text-slate-900', 'ScaleIcon', 'bg-slate-100 text-slate-600'],
          ['Sridhar Investment In', money(summary?.sridharIn), 'text-teal-600', 'ArrowDownTrayIcon', 'bg-teal-50 text-teal-600'],
          ['Sridhar Investment Out', money(summary?.sridharOut), 'text-orange-600', 'ArrowUpTrayIcon', 'bg-orange-50 text-orange-600'],
        ].map(([label, value, valueTone, icon, iconTone]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className={`mt-2 text-xl font-semibold tracking-tight ${valueTone}`}>{value}</p>
              </div>
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconTone}`}>
                <Icon name={String(icon)} size={18} />
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm shadow-sm">
        <span className="inline-flex items-center gap-2 font-semibold text-slate-800">
          <Icon name="BuildingLibraryIcon" size={18} className="text-secondary" /> Bank Statement Import
        </span>
        <Icon name="ChevronRightIcon" size={14} className="text-slate-300" />
        <Link href="/admin/finance/transactions/income" className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700 hover:bg-emerald-100">
          Income ({summary?.incomeCount || 0})
        </Link>
        <Icon name="ChevronRightIcon" size={14} className="text-slate-300" />
        <Link href="/admin/finance/transactions/expenses" className="rounded-full bg-rose-50 px-3 py-1 font-medium text-rose-700 hover:bg-rose-100">
          Expenses ({summary?.expenseCount || 0})
        </Link>
        <Icon name="ChevronRightIcon" size={14} className="text-slate-300" />
        <Link href="/admin/finance/transactions/sridhar" className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700 hover:bg-sky-100">
          Sridhar Investment ({summary?.sridharCount || 0})
        </Link>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap gap-1 border-b border-slate-100 px-4 pt-3">
          {(
            [
              ['all', `All Transactions (${summary?.totalCount || 0})`],
              ['income', `Income (${summary?.incomeCount || 0})`],
              ['expense', `Expenses (${summary?.expenseCount || 0})`],
              ['sridhar', `Sridhar Investment (${summary?.sridharCount || 0})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`border-b-2 px-3 pb-3 text-sm font-semibold ${tab === id ? 'border-secondary text-secondary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              onClick={() => {
                setTab(id);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 lg:flex-row lg:items-center lg:flex-wrap">
          <label className="relative min-w-[240px] flex-1">
            <Icon name="MagnifyingGlassIcon" className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} />
            <input
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-3 text-sm outline-none focus:border-secondary focus:bg-white"
              placeholder="Search by description, provider, reference, or amount..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  setPage(1);
                  void load(year, month, 1);
                }
              }}
            />
          </label>
          <select
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
            value={year && month ? `${year}-${month}` : ''}
            onChange={(event) => {
              if (!event.target.value) {
                setYear('');
                setMonth('');
                setPage(1);
                return;
              }
              const [nextYear, nextMonth] = event.target.value.split('-').map(Number);
              setYear(nextYear);
              setMonth(nextMonth);
              setPage(1);
            }}
          >
            <option value="">All periods</option>
            {yearOptions.flatMap((y) =>
              MONTHS.map((name, index) => (
                <option key={`${y}-${index + 1}`} value={`${y}-${index + 1}`}>
                  {name} {y}
                </option>
              ))
            )}
          </select>
          <select
            className="h-10 min-w-[180px] rounded-xl border border-slate-200 px-3 text-sm"
            value={provider}
            onChange={(event) => {
              setProvider(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All service providers</option>
            {providers.map((item) => (
              <option key={item.partyName} value={item.partyName}>
                {item.partyName} ({item.count})
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
            value={type}
            onChange={(event) => {
              setType(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All Transactions</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
          </select>
          <select
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All Categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <AdminButton
            onClick={() => {
              setQuery('');
              setType('');
              setCategory('');
              setProvider('');
              setYear('');
              setMonth('');
              setPage(1);
            }}
          >
            Reset
          </AdminButton>
          <AdminButton
            variant="primary"
            onClick={() => {
              setPage(1);
              void load(year, month, 1);
            }}
          >
            Search
          </AdminButton>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Date</th>
                <th className="px-3 py-3">Description</th>
                <th className="px-3 py-3">Service Provider</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Source Module</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/40">
                  <td className="px-4 py-3 text-slate-600">{stamp(row.txn_date)}</td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-slate-900">{row.description}</p>
                    {row.reference ? <p className="text-xs text-slate-400">{row.reference}</p> : null}
                    {row.service_name ? <p className="text-xs text-slate-400">Service: {row.service_name}</p> : null}
                  </td>
                  <td className="px-3 py-3 text-slate-700">{row.party_name || '—'}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${moduleTone(row.source_module)}`}>{row.category_label || '—'}</span>
                  </td>
                  <td className="px-3 py-3 capitalize text-slate-600">{row.source_module === 'sridhar' ? 'Sridhar Investment' : row.source_module}</td>
                  <td className="px-3 py-3">
                    {row.direction === 'credit' ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                        <Icon name="ArrowUpIcon" size={14} /> Credit
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-rose-600">
                        <Icon name="ArrowDownIcon" size={14} /> Debit
                      </span>
                    )}
                  </td>
                  <td className={`px-3 py-3 font-semibold ${row.direction === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>{money(row.amount)}</td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      <Icon name="CheckCircleIcon" size={14} /> Posted
                    </span>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">
                    No bank transactions for this filter. Import an Excel or PDF statement, or clear filters to see all data.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <p>
            Showing {total ? (page - 1) * PAGE_SIZE + 1 : 0} to {Math.min(page * PAGE_SIZE, total)} of {total} transactions
            {provider ? ` · ${provider}` : ''}.
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="h-8 rounded-lg px-2.5 hover:bg-slate-50 disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Prev
            </button>
            {pageNumbers.map((number) => (
              <button
                key={number}
                type="button"
                className={`h-8 min-w-8 rounded-lg px-2 text-sm ${number === page ? 'bg-secondary font-semibold text-white' : 'hover:bg-slate-50'}`}
                onClick={() => setPage(number)}
              >
                {number}
              </button>
            ))}
            <button
              type="button"
              className="h-8 rounded-lg px-2.5 hover:bg-slate-50 disabled:opacity-40"
              disabled={page >= pages}
              onClick={() => setPage((current) => Math.min(pages, current + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {importOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4" onClick={() => !busy && setImportOpen(false)}>
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Import Statement</h2>
                <p className="mt-1 text-sm text-slate-500">Upload Excel or PDF. Matching invoice payments and receipts are reconciled; same client/amount/service duplicates are skipped.</p>
              </div>
              <button type="button" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" onClick={() => setImportOpen(false)} aria-label="Close">
                <Icon name="XMarkIcon" size={18} />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="mb-1.5 block font-medium text-slate-700">Month</span>
                <select className="h-11 w-full rounded-xl border border-slate-200 px-3" value={importMonth} onChange={(event) => setImportMonth(Number(event.target.value))}>
                  {MONTHS.map((name, index) => (
                    <option key={name} value={index + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1.5 block font-medium text-slate-700">Year</span>
                <select className="h-11 w-full rounded-xl border border-slate-200 px-3" value={importYear} onChange={(event) => setImportYear(Number(event.target.value))}>
                  {yearOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
              <Icon name="ArrowUpTrayIcon" className="mx-auto text-slate-400" size={28} />
              <p className="mt-2 text-sm font-medium text-slate-700">Choose Excel (.xlsx), CSV, or PDF</p>
              <p className="mt-1 text-xs text-slate-500">
                Employee-name / salary narrations are posted as Employee Salaries. Sridhar lines stay separate. Duplicate files are blocked unless fill-missing is on.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.XLSX,.csv,.pdf,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="mt-4 block w-full text-sm"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) void importFile(file);
                }}
              />
            </div>
            <label className="mt-4 flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <input className="mt-1" type="checkbox" checked={fillMissing} onChange={(event) => setFillMissing(event.target.checked)} disabled={busy} />
              <span>
                <span className="font-semibold text-slate-900">Only add missing transactions</span>
                <span className="mt-0.5 block text-xs text-slate-500">Use when re-uploading a statement. Existing rows stay untouched; only new lines are posted.</span>
              </span>
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <AdminButton disabled={busy} onClick={() => setImportOpen(false)}>
                Cancel
              </AdminButton>
              <AdminButton variant="primary" disabled={busy} onClick={() => fileRef.current?.click()}>
                {busy ? 'Importing...' : 'Select file'}
              </AdminButton>
            </div>
          </div>
        </div>
      ) : null}

      <AdminStatusModal
        open={Boolean(statusModal)}
        title={statusModal?.title || ''}
        message={statusModal?.message || ''}
        variant={statusModal?.variant || 'success'}
        onClose={() => setStatusModal(null)}
      />
    </FinanceShell>
  );
}
