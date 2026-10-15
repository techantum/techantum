'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import { FilterBar, FilterSelect, financialYearChoices, useListFilters } from '@/components/admin/ListFilters';
import { FinanceShell, FinanceTd, FinanceTh, money } from '@/components/admin/finance/FinanceUi';
import { currentFinancialYear } from '@/lib/finance/fy';

const REPORTS = [
  ['summary', 'Financial summary'],
  ['invoices', 'Invoice / Sales Register'],
  ['invoice-payments', 'Invoice Payment Register'],
  ['receipts', 'Receipts Register'],
  ['receivables', 'Receivables Report'],
  ['clients', 'Client Billing Summary'],
  ['vendors', 'Vendor Payment Summary'],
  ['categories', 'Receipt Category Summary'],
  ['gst', 'GST Summary'],
  ['tds', 'TDS Summary'],
  ['pnl', 'Monthly Invoice vs Receipt Summary'],
  ['transactions', 'Transaction Register'],
  ['payslips', 'Payslip / Salary Summary'],
];

const reportFilters = { kind: 'summary', fy: currentFinancialYear().label };

export default function ReportsPage() {
  const filters = useListFilters(reportFilters);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const kind = filters.applied.kind;
  const fy = filters.applied.fy;

  useEffect(() => {
    fetch(`/api/admin/finance/reports/${kind}?period=financial_year&fy=${encodeURIComponent(fy)}`)
      .then((r) => r.json())
      .then(setData);
  }, [kind, fy]);

  const rows = (data?.rows as Record<string, unknown>[] | undefined) || (data?.clientPayments as Record<string, unknown>[] | undefined);
  const summary = data && !data.rows ? data : null;
  const excelKind =
    kind === 'summary' ? 'invoices'
    : kind === 'pnl' ? 'transactions'
    : kind === 'categories' || kind === 'vendors' ? 'receipts'
    : kind === 'receivables' || kind === 'clients' ? 'invoices'
    : kind;

  return (
    <FinanceShell>
      <AdminPageHeader title="Reports" description="Revenue from invoices and invoice payments. Spending from receipts. GST and TDS summaries are not statutory filings." />
      <FilterBar
        onSearch={filters.search}
        onClear={filters.clear}
        searchLabel="Run"
        extra={
          <a href={`/api/admin/finance/ca-export?kind=${excelKind}&fy=${encodeURIComponent(filters.draft.fy)}`}>
            <AdminButton variant="primary" type="button">Download Excel</AdminButton>
          </a>
        }
      >
        <FilterSelect icon="DocumentChartBarIcon" value={filters.draft.kind} onChange={(value) => filters.set('kind', value)} className="w-72">
          {REPORTS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </FilterSelect>
        <FilterSelect icon="CalendarDaysIcon" value={filters.draft.fy} onChange={(value) => filters.set('fy', value)} className="w-40">
          {financialYearChoices(filters.draft.fy).map((year) => <option key={year} value={year}>{year}</option>)}
        </FilterSelect>
      </FilterBar>
      {kind === 'summary' && summary && (
        <AdminSection title="Financial summary" icon="ChartBarIcon">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 text-sm">
            {['totalInvoiced','totalCollected','outstanding','totalReceipts','receiptsPaid','netCashPosition'].map((k) => (
              <div key={k} className="rounded-xl border border-slate-200 p-3">
                <p className="text-[10px] uppercase text-slate-400">{k.replace(/[A-Z]/g, (m) => ` ${m}`)}</p>
                <p className="font-semibold">{money(summary[k])}</p>
              </div>
            ))}
          </div>
        </AdminSection>
      )}
      {kind === 'gst' && data && (
        <AdminSection title="GST summary" icon="ReceiptPercentIcon">
          <p className="text-xs text-slate-500">{String(data.disclaimer || '')}</p>
          <pre className="mt-3 overflow-auto rounded-xl bg-slate-50 p-3 text-xs">{JSON.stringify({ output: data.output, input: data.input }, null, 2)}</pre>
        </AdminSection>
      )}
      {kind === 'receivables' && data && (
        <AdminSection title="Receivables ageing" icon="ClockIcon">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5 text-sm">
            {Object.entries((data.buckets as Record<string, string>) || {}).map(([k, v]) => (
              <div key={k} className="rounded-xl border border-slate-200 p-3">
                <p className="text-[10px] uppercase text-slate-400">{k.replace('_', '–')}</p>
                <p className="font-semibold">{money(v)}</p>
              </div>
            ))}
          </div>
        </AdminSection>
      )}
      {Array.isArray(rows) && rows.length > 0 && (
        <AdminSection title="Rows" icon="TableCellsIcon">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  {Object.keys(rows[0]).slice(0, 10).map((k) => <FinanceTh key={k}>{k.replace(/_/g, ' ')}</FinanceTh>)}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((row, i) => (
                  <tr key={i}>
                    {Object.keys(rows[0]).slice(0, 10).map((k) => <FinanceTd key={k}>{String(row[k] ?? '')}</FinanceTd>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminSection>
      )}
    </FinanceShell>
  );
}
