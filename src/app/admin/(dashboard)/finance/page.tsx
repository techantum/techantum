'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminStatCard from '@/components/admin/AdminStatCard';
import AdminField, { adminInputClass, adminSelectClass } from '@/components/admin/AdminField';
import AdminAlert from '@/components/admin/AdminAlert';
import { FinanceLink, FinanceShell, FinanceTd, FinanceTh, money } from '@/components/admin/finance/FinanceUi';
import { currentFinancialYear } from '@/lib/finance/fy';

type Dashboard = {
  period: { from: string; to: string; label: string; fy: string };
  cards: Record<string, string>;
  recentTransactions: { id: string; transaction_date: string; transaction_type: string; description: string; money_in: string; money_out: string }[];
  outstandingInvoices: { id: string; invoice_number: string; client_name: string; outstanding_amount: string; due_date: string; payment_status: string }[];
  overdueInvoices: { id: string; invoice_number: string; client_name: string; outstanding_amount: string; due_date: string }[];
  receiptsMissingDocs: { id: string; expense_date: string; description: string; vendor_name: string; total_amount: string }[];
  monthly: { month: string; invoiced?: string; received?: string; receipts?: string; income?: string; expense?: string }[];
  receiptsByCategory: { name: string; total: string }[];
};

export default function FinanceDashboardPage() {
  const [period, setPeriod] = useState('current_month');
  const [fy, setFy] = useState(currentFinancialYear().label);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams({ period });
    if (period === 'financial_year') params.set('fy', fy);
    if (period === 'custom' && from && to) {
      params.set('from', from);
      params.set('to', to);
    }
    fetch(`/api/admin/finance/dashboard?${params}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Failed to load dashboard');
        setData(body);
        setError('');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load dashboard'));
  }, [period, fy, from, to]);

  const chart = useMemo(
    () =>
      (data?.monthly || []).map((row) => ({
        month: row.month,
        Received: Number(row.received || row.income || 0),
        Receipts: Number(row.receipts || row.expense || 0),
      })),
    [data]
  );

  const cards = data?.cards;

  return (
    <FinanceShell>
      <AdminPageHeader
        title="Finance"
        description="Revenue from invoices and invoice payments. Spending from receipts. No separate income register."
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <AdminField label="Period">
          <select className={adminSelectClass} value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="current_month">Current Month</option>
            <option value="previous_month">Previous Month</option>
            <option value="financial_year">Financial Year</option>
            <option value="custom">Custom Date Range</option>
          </select>
        </AdminField>
        {period === 'financial_year' && (
          <AdminField label="Indian FY">
            <input className={adminInputClass} value={fy} onChange={(e) => setFy(e.target.value)} placeholder="2026-27" />
          </AdminField>
        )}
        {period === 'custom' && (
          <>
            <AdminField label="From">
              <input type="date" className={adminInputClass} value={from} onChange={(e) => setFrom(e.target.value)} />
            </AdminField>
            <AdminField label="To">
              <input type="date" className={adminInputClass} value={to} onChange={(e) => setTo(e.target.value)} />
            </AdminField>
          </>
        )}
      </div>
      {error && <AdminAlert variant="error">{error}</AdminAlert>}
      <p className="text-xs text-slate-500">{data?.period.label} · {data?.period.from} to {data?.period.to}</p>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <AdminStatCard label="Total Invoiced" value={cards ? money(cards.totalInvoiced) : '—'} icon="DocumentTextIcon" />
        <AdminStatCard label="Total Received" value={cards ? money(cards.paymentsReceived) : '—'} icon="BanknotesIcon" accent="green" />
        <AdminStatCard label="Outstanding" value={cards ? money(cards.outstanding) : '—'} icon="ClockIcon" accent="amber" />
        <AdminStatCard label="Total Receipts" value={cards ? money(cards.totalReceipts) : '—'} icon="ReceiptRefundIcon" accent="rose" />
        <AdminStatCard label="Receipts Paid" value={cards ? money(cards.receiptsPaid) : '—'} />
        <AdminStatCard label="Net Cash Position" value={cards ? money(cards.netCashPosition) : '—'} hint="Invoice payments received − receipts paid" accent="violet" icon="CalculatorIcon" />
      </div>
      <AdminSection title="Invoice payments vs receipts (cash)">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Received" fill="#059669" />
              <Bar dataKey="Receipts" fill="#e11d48" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </AdminSection>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AdminSection title="Outstanding invoices">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <FinanceTh>Invoice</FinanceTh>
                <FinanceTh>Client</FinanceTh>
                <FinanceTh>Due</FinanceTh>
                <FinanceTh>Amount</FinanceTh>
              </tr>
            </thead>
            <tbody>
              {(data?.outstandingInvoices || []).map((row) => (
                <tr key={row.id}>
                  <FinanceTd>
                    <FinanceLink href={`/admin/finance/invoices/${row.id}`}>{row.invoice_number}</FinanceLink>
                  </FinanceTd>
                  <FinanceTd>{row.client_name}</FinanceTd>
                  <FinanceTd>{row.due_date || '—'}</FinanceTd>
                  <FinanceTd>{money(row.outstanding_amount)}</FinanceTd>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.outstandingInvoices?.length && <p className="py-3 text-sm text-slate-500">No outstanding invoices.</p>}
        </AdminSection>
        <AdminSection title="Overdue invoices">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <FinanceTh>Invoice</FinanceTh>
                <FinanceTh>Client</FinanceTh>
                <FinanceTh>Due</FinanceTh>
                <FinanceTh>Amount</FinanceTh>
              </tr>
            </thead>
            <tbody>
              {(data?.overdueInvoices || []).map((row) => (
                <tr key={row.id}>
                  <FinanceTd>
                    <FinanceLink href={`/admin/finance/invoices/${row.id}`}>{row.invoice_number}</FinanceLink>
                  </FinanceTd>
                  <FinanceTd>{row.client_name}</FinanceTd>
                  <FinanceTd>{row.due_date || '—'}</FinanceTd>
                  <FinanceTd>{money(row.outstanding_amount)}</FinanceTd>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.overdueInvoices?.length && <p className="py-3 text-sm text-slate-500">No overdue invoices.</p>}
        </AdminSection>
        <AdminSection title="Recent transactions">
          {(data?.recentTransactions || []).map((row) => (
            <div key={row.id} className="flex justify-between border-b border-slate-100 py-2 text-sm">
              <div>
                <p className="font-medium">{row.description || row.transaction_type}</p>
                <p className="text-xs text-slate-500">{row.transaction_date}</p>
              </div>
              <p className={Number(row.money_in) > 0 ? 'text-emerald-700' : 'text-rose-700'}>
                {Number(row.money_in) > 0 ? money(row.money_in) : money(row.money_out)}
              </p>
            </div>
          ))}
        </AdminSection>
        <AdminSection title="Receipts missing supporting document">
          {(data?.receiptsMissingDocs || []).map((row) => (
            <div key={row.id} className="flex justify-between border-b border-slate-100 py-2 text-sm">
              <div>
                <FinanceLink href={`/admin/finance/receipts/${row.id}`}>{row.description}</FinanceLink>
                <p className="text-xs text-slate-500">{row.vendor_name || 'No vendor'} · {row.expense_date}</p>
              </div>
              <span>{money(row.total_amount)}</span>
            </div>
          ))}
          {!data?.receiptsMissingDocs?.length && <p className="text-sm text-slate-500">All recorded receipts have a supporting document.</p>}
        </AdminSection>
      </div>
      <AdminSection title="Receipts by category">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <FinanceTh>Category</FinanceTh>
              <FinanceTh>Amount</FinanceTh>
            </tr>
          </thead>
          <tbody>
            {(data?.receiptsByCategory || []).map((row) => (
              <tr key={row.name}>
                <FinanceTd>{row.name}</FinanceTd>
                <FinanceTd>{money(row.total)}</FinanceTd>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminSection>
    </FinanceShell>
  );
}
