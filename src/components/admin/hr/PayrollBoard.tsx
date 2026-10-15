'use client';

import { useEffect, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import AdminField, { adminInputClass, adminSelectClass } from '@/components/admin/AdminField';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatCard from '@/components/admin/AdminStatCard';
import { FinanceShell, FinanceTd, FinanceTh, StatusBadge } from '@/components/admin/finance/FinanceUi';
import { PeriodPicker, inr } from './PeriodPicker';

const now = new Date();

type PayrollRow = Record<string, string> & { id: string; status: string; pending_days: string };

export default function PayrollBoard() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [summary, setSummary] = useState<Record<string, string | number> | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [extras, setExtras] = useState({ additional_earnings: '0', other_deductions: '0' });
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);

  const load = async (nextYear = year, nextMonth = month) => {
    const params = new URLSearchParams({ year: String(nextYear), month: String(nextMonth), q: query, status });
    const response = await fetch(`/api/admin/hr/payroll?${params}`);
    const body = await response.json();
    if (!response.ok) setError(body.error || 'Could not load payroll');
    else {
      setRows(body.rows || []);
      setSummary(body.summary || null);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const post = async (path: string, payload: unknown, success: string) => {
    setError('');
    setMessage('');
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || 'Request failed');
      return null;
    }
    setMessage(success);
    if (body.warnings) setWarnings(body.warnings);
    await load();
    return body;
  };

  const open = async (id: string) => {
    const response = await fetch(`/api/admin/hr/payroll/${id}`);
    const body = await response.json();
    if (!response.ok) setError(body.error || 'Could not open payroll');
    else {
      setDetail(body);
      const payroll = body.payroll as PayrollRow;
      setExtras({ additional_earnings: payroll.additional_earnings || '0', other_deductions: payroll.other_deductions || '0' });
    }
  };

  const payslip = async (row: PayrollRow) => {
    const response = await fetch('/api/admin/finance/payslips/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: row.employee_id, payroll_month: row.payroll_month, payroll_year: row.payroll_year, revise: true }),
    });
    const body = await response.json();
    if (!response.ok) setError(body.error || 'Could not generate payslip');
    else setMessage('Payslip saved from the approved payroll.');
  };

  const payroll = (detail?.payroll || null) as PayrollRow | null;

  return (
    <FinanceShell>
      <AdminPageHeader
        kicker="Human Resources"
        title="Monthly Payroll"
        description="Draft payroll follows attendance. Approval stores a snapshot, and payslips use that snapshot."
        action={<PeriodPicker year={year} month={month} onChange={(next) => { setYear(next.year); setMonth(next.month); }} />}
      />
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}
      {warnings.map((warning) => <AdminAlert key={warning}>{warning}</AdminAlert>)}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <AdminStatCard label="Employees" value={summary?.employees ?? '—'} icon="UsersIcon" />
        <AdminStatCard label="Gross payroll" value={summary ? inr(summary.gross) : '—'} icon="BanknotesIcon" />
        <AdminStatCard label="LOP days" value={summary?.lopDays ?? '—'} icon="CalendarDaysIcon" />
        <AdminStatCard label="LOP deduction" value={summary ? inr(summary.lopDeduction) : '—'} icon="MinusCircleIcon" accent="rose" />
        <AdminStatCard label="Net payable" value={summary ? inr(summary.net) : '—'} icon="CurrencyRupeeIcon" accent="green" />
        <AdminStatCard label="Pending approval" value={summary?.pendingApprovals ?? '—'} icon="ClockIcon" accent="amber" />
      </div>
      <div className="flex flex-wrap gap-2">
        <input className={`${adminInputClass} w-52`} placeholder="Search employee" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className={`${adminSelectClass} w-48`} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          <option value="attendance_pending">Attendance pending</option>
          <option value="ready_for_approval">Ready for approval</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
        </select>
        <AdminButton onClick={() => load()}>Filter</AdminButton>
        <AdminButton variant="primary" onClick={() => post('/api/admin/hr/payroll/generate', { year, month }, 'Draft payroll generated')}>Generate</AdminButton>
        <AdminButton onClick={() => post('/api/admin/hr/payroll/approve', { ids: selected }, 'Payroll approved')} disabled={!selected.length}>Approve</AdminButton>
        <AdminButton onClick={() => post('/api/admin/hr/payroll/paid', { ids: selected }, 'Payroll marked paid')} disabled={!selected.length}>Mark paid</AdminButton>
        <a className="inline-flex items-center rounded-full border border-slate-200 px-3 text-sm font-semibold" href={`/api/admin/hr/payroll/export?year=${year}&month=${month}`}>Excel</a>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr>
              <FinanceTh> </FinanceTh>
              <FinanceTh>Employee</FinanceTh>
              <FinanceTh>Gross</FinanceTh>
              <FinanceTh>Working</FinanceTh>
              <FinanceTh>Present</FinanceTh>
              <FinanceTh>Paid leave</FinanceTh>
              <FinanceTh>LOP</FinanceTh>
              <FinanceTh>Payable</FinanceTh>
              <FinanceTh>LOP deduction</FinanceTh>
              <FinanceTh>Net</FinanceTh>
              <FinanceTh>Status</FinanceTh>
              <FinanceTh> </FinanceTh>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <FinanceTd>
                  <input type="checkbox" checked={selected.includes(row.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, row.id] : selected.filter((id) => id !== row.id))} />
                </FinanceTd>
                <FinanceTd className="whitespace-nowrap">{row.full_name}<span className="ml-2 text-xs text-slate-400">{row.employee_code}</span></FinanceTd>
                <FinanceTd className="whitespace-nowrap">{inr(row.monthly_gross)}</FinanceTd>
                <FinanceTd>{row.company_working_days}</FinanceTd>
                <FinanceTd>{row.present_days}</FinanceTd>
                <FinanceTd>{row.paid_leave_days}</FinanceTd>
                <FinanceTd>{row.lop_days}</FinanceTd>
                <FinanceTd>{row.payable_days}</FinanceTd>
                <FinanceTd className="whitespace-nowrap">{inr(row.lop_deduction)}</FinanceTd>
                <FinanceTd className="whitespace-nowrap">{inr(row.net_payable)}</FinanceTd>
                <FinanceTd><StatusBadge value={row.status} /></FinanceTd>
                <FinanceTd className="whitespace-nowrap">
                  <button type="button" className="text-xs font-semibold text-secondary" onClick={() => open(row.id)}>View</button>
                  {row.status === 'approved' || row.status === 'paid' ? (
                    <button type="button" className="ml-2 text-xs font-semibold text-secondary" onClick={() => payslip(row)}>Payslip</button>
                  ) : null}
                </FinanceTd>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {payroll ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
          <h2 className="font-semibold text-slate-900">{payroll.full_name} · revision {payroll.revision}</h2>
          <p className="mt-1 text-slate-500">Per-day salary ₹{payroll.per_day_salary}. Prorated gross {inr(payroll.prorated_gross)}. Professional tax {inr(payroll.professional_tax)}. Pending days {payroll.pending_days}.</p>
          {payroll.status === 'approved' || payroll.status === 'paid' ? (
            <div className="mt-3 flex gap-2">
              <input className={adminInputClass} placeholder="Revision reason" value={reason} onChange={(event) => setReason(event.target.value)} />
              <AdminButton onClick={() => post(`/api/admin/hr/payroll/${payroll.id}/revise`, { reason }, 'Revision opened')}>Revise</AdminButton>
            </div>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <AdminField label="Additional earnings"><input className={adminInputClass} value={extras.additional_earnings} onChange={(event) => setExtras({ ...extras, additional_earnings: event.target.value })} /></AdminField>
              <AdminField label="Other deductions"><input className={adminInputClass} value={extras.other_deductions} onChange={(event) => setExtras({ ...extras, other_deductions: event.target.value })} /></AdminField>
              <AdminButton onClick={() => post(`/api/admin/hr/payroll/${payroll.id}/extras`, extras, 'Payroll recalculated')}>Save extras</AdminButton>
            </div>
          )}
        </div>
      ) : null}
    </FinanceShell>
  );
}
