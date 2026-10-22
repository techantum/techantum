'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import AdminField, { adminInputClass } from '@/components/admin/AdminField';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Icon from '@/components/ui/AppIcon';
import { formatINR, toCents } from '@/lib/finance/money';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const control = 'h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-secondary';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  attendance_pending: 'Attendance Pending',
  ready_for_approval: 'Ready for Approval',
  approved: 'Approved',
  paid: 'Paid',
};

const STATUS_TONE: Record<string, string> = {
  draft: 'bg-amber-50 text-amber-700',
  attendance_pending: 'bg-sky-50 text-sky-700',
  ready_for_approval: 'bg-emerald-50 text-emerald-700',
  approved: 'bg-emerald-50 text-emerald-700',
  paid: 'bg-emerald-50 text-emerald-700',
};

type PayrollRow = Record<string, string> & { id: string; status: string; pending_days: string; payslip_id?: string | null };

function rupees(value: unknown) {
  if (value == null || value === '') return '—';
  return formatINR(toCents(value));
}

function days(value: unknown) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return '0';
  return Number.isInteger(amount) ? String(amount) : String(Math.round(amount * 100) / 100);
}

export default function PayrollBoard() {
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)));
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [department, setDepartment] = useState('');
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [summary, setSummary] = useState<Record<string, string | number> | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [panel, setPanel] = useState<'view' | 'edit' | ''>('');
  const [extras, setExtras] = useState({ additional_earnings: '0', other_deductions: '0' });
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const load = async (nextYear = year, nextMonth = month) => {
    const params = new URLSearchParams({ year: String(nextYear), month: String(nextMonth) });
    const response = await fetch(`/api/admin/hr/payroll?${params}`);
    const body = await response.json();
    if (!response.ok) setError(body.error || 'Could not load payroll');
    else {
      setRows(body.rows || []);
      setSummary(body.summary || null);
      setSelected([]);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const departments = useMemo(() => [...new Set(rows.map((row) => row.department).filter(Boolean))].sort() as string[], [rows]);
  const visible = rows.filter((row) => {
    if (status && row.status !== status) return false;
    if (department && row.department !== department) return false;
    const text = query.trim().toLowerCase();
    if (!text) return true;
    return `${row.full_name} ${row.employee_code}`.toLowerCase().includes(text);
  });
  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * pageSize;
  const pageRows = visible.slice(start, start + pageSize);
  const pageIds = pageRows.map((row) => row.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));

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
    setWarnings(Array.isArray(body.warnings) ? body.warnings : []);
    setPanel('');
    setDetail(null);
    await load();
    return body;
  };

  const open = async (id: string, mode: 'view' | 'edit') => {
    setError('');
    const response = await fetch(`/api/admin/hr/payroll/${id}`);
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || 'Could not open payroll');
      return;
    }
    const payroll = body.payroll as PayrollRow;
    setDetail(body);
    setExtras({ additional_earnings: payroll.additional_earnings || '0', other_deductions: payroll.other_deductions || '0' });
    setReason('');
    setPanel(mode);
  };

  const payslip = async (row: PayrollRow) => {
    setError('');
    setMessage('');
    if (row.payslip_id) {
      window.open(`/api/admin/finance/payslips/${row.payslip_id}/download`, '_blank', 'noopener,noreferrer');
      return;
    }
    if (row.status !== 'approved' && row.status !== 'paid') {
      setError('Approve monthly payroll before generating this payslip.');
      return;
    }
    const response = await fetch('/api/admin/finance/payslips/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: row.employee_id, payroll_month: row.payroll_month, payroll_year: row.payroll_year, revise: true }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || 'Could not generate payslip');
      return;
    }
    setMessage('Payslip saved from the approved payroll.');
    await load();
  };

  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const togglePage = () => setSelected((current) => allPageSelected ? current.filter((id) => !pageIds.includes(id)) : [...new Set([...current, ...pageIds])]);

  const payroll = (detail?.payroll || null) as PayrollRow | null;
  const locked = payroll?.status === 'approved' || payroll?.status === 'paid';
  const events = Array.isArray(detail?.events) ? detail.events as { from_status?: string; to_status?: string; note?: string; created_at?: string }[] : [];

  const cards = [
    ['Total Employees', summary?.employees ?? '—', 'bg-sky-50 text-sky-600', 'UsersIcon'],
    ['Gross Payroll', summary ? rupees(summary.gross) : '—', 'bg-violet-50 text-violet-600', 'BanknotesIcon'],
    ['Net Payable', summary ? rupees(summary.net) : '—', 'bg-emerald-50 text-emerald-600', 'CreditCardIcon'],
    ['LOP Deduction', summary ? rupees(summary.lopDeduction) : '—', 'bg-rose-50 text-rose-600', 'MinusCircleIcon'],
    ['Pending Approval', summary?.pendingApprovals ?? '—', 'bg-amber-50 text-amber-600', 'ClockIcon'],
    ['Approved Payroll', summary?.approved ?? '—', 'bg-emerald-50 text-emerald-600', 'CheckCircleIcon'],
  ];

  return (
    <div className="space-y-4">
      <AdminPageHeader
        kicker="Human Resources"
        title="Monthly Payroll"
        description="Generate, review, approve, and track monthly payroll based on attendance and leave records."
        action={
          <div className="flex gap-2">
            <select className={`${control} min-w-[140px]`} value={month} onChange={(event) => { setMonth(Number(event.target.value)); setPage(1); }}>
              {MONTHS.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
            </select>
            <select className={`${control} w-28`} value={year} onChange={(event) => { setYear(Number(event.target.value)); setPage(1); }}>
              {[Number(today.slice(0, 4)) - 1, Number(today.slice(0, 4)), Number(today.slice(0, 4)) + 1].map((value) => <option key={value}>{value}</option>)}
            </select>
          </div>
        }
      />
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}
      {warnings.map((warning) => <AdminAlert key={warning}>{warning}</AdminAlert>)}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {cards.map(([label, value, tone, icon]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs text-slate-500">{label}</span>
              <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${tone}`}><Icon name={String(icon)} size={16} /></span>
            </div>
            <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <label className="relative min-w-[240px] flex-1">
          <Icon name="MagnifyingGlassIcon" className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} />
          <input className={`${control} w-full pl-9`} placeholder="Search employee by name or ID..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
        </label>
        <select className={`${control} xl:w-44`} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select className={`${control} xl:w-44`} value={department} onChange={(event) => { setDepartment(event.target.value); setPage(1); }}>
          <option value="">All Departments</option>
          {departments.map((item) => <option key={item}>{item}</option>)}
        </select>
        <AdminButton variant="primary" onClick={() => post('/api/admin/hr/payroll/generate', { year, month }, 'Draft payroll generated')}>+ Generate Payroll</AdminButton>
        <AdminButton onClick={() => selected.length ? post('/api/admin/hr/payroll/approve', { ids: selected }, 'Payroll approved') : setError('Select a payroll record to approve')}>Approve Payroll</AdminButton>
        <a className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-secondary/40" href={`/api/admin/hr/payroll/export?year=${year}&month=${month}`}>
          <Icon name="ArrowDownTrayIcon" size={16} /> Export Excel
        </a>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">
                  <input type="checkbox" aria-label="Select page" checked={allPageSelected} onChange={togglePage} />
                </th>
                {['Employee', 'Employee ID', 'Gross Salary', 'Leave / LOP Days', 'LOP Deduction', 'Net Payable', 'Payroll Status', 'Payslip Status', 'Actions'].map((heading) => (
                  <th key={heading} className="px-3 py-3">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <input type="checkbox" aria-label={`Select ${row.full_name}`} checked={selected.includes(row.id)} onChange={() => toggle(row.id)} />
                  </td>
                  <td className="px-3 py-3">
                    <span className="block font-semibold text-slate-900">{row.full_name}</span>
                    {row.department ? <span className="block text-xs text-slate-400">{row.department}</span> : null}
                  </td>
                  <td className="px-3 py-3 text-slate-500">{row.employee_code}</td>
                  <td className="px-3 py-3">{rupees(row.monthly_gross)}</td>
                  <td className="px-3 py-3">{days(row.paid_leave_days)} / {days(row.lop_days)}</td>
                  <td className="px-3 py-3">{rupees(row.lop_deduction)}</td>
                  <td className="px-3 py-3 font-medium">{rupees(row.net_payable)}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[row.status] || 'bg-slate-100 text-slate-600'}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {STATUS_LABEL[row.status] || row.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${row.payslip_id ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${row.payslip_id ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {row.payslip_id ? 'Payslip Generated' : 'Not Generated'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1 text-slate-400">
                      <button type="button" className="rounded-lg p-1.5 hover:bg-slate-100 hover:text-slate-700" aria-label="View payroll" onClick={() => open(row.id, 'view')}><Icon name="EyeIcon" size={16} /></button>
                      <button type="button" className="rounded-lg p-1.5 hover:bg-slate-100 hover:text-slate-700" aria-label="Edit payroll" onClick={() => open(row.id, 'edit')}><Icon name="PencilSquareIcon" size={16} /></button>
                      <button type="button" className="rounded-lg p-1.5 hover:bg-slate-100 hover:text-slate-700" aria-label={row.payslip_id ? 'Download payslip' : 'Generate payslip'} onClick={() => payslip(row)}><Icon name="DocumentTextIcon" size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!pageRows.length ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-slate-500">No payroll records for this month. Generate payroll after attendance is marked.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <p>Showing {visible.length ? start + 1 : 0} to {Math.min(start + pageSize, visible.length)} of {visible.length} employees</p>
          <div className="flex items-center gap-1">
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50" aria-label="Previous page" onClick={() => setPage(Math.max(1, currentPage - 1))}><Icon name="ChevronLeftIcon" size={16} /></button>
            {Array.from({ length: pages }, (_, index) => index + 1).slice(0, 5).map((number) => (
              <button key={number} type="button" className={`h-8 w-8 rounded-lg text-sm ${number === currentPage ? 'bg-secondary font-semibold text-white' : 'text-slate-500 hover:bg-slate-50'}`} onClick={() => setPage(number)}>{number}</button>
            ))}
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50" aria-label="Next page" onClick={() => setPage(Math.min(pages, currentPage + 1))}><Icon name="ChevronRightIcon" size={16} /></button>
          </div>
        </div>
      </section>

      {payroll && panel ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/30 p-4 sm:items-center" onClick={() => setPanel('')}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bricolage text-lg font-bold text-slate-900">{payroll.full_name}</h2>
                <p className="text-sm text-slate-500">{payroll.employee_code}{payroll.department ? ` · ${payroll.department}` : ''} · revision {payroll.revision}</p>
              </div>
              <button type="button" className="text-sm text-slate-400" onClick={() => setPanel('')}>Close</button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              {[
                ['Status', STATUS_LABEL[payroll.status] || payroll.status],
                ['Gross salary', rupees(payroll.monthly_gross)],
                ['Net payable', rupees(payroll.net_payable)],
                ['Leave / LOP', `${days(payroll.paid_leave_days)} / ${days(payroll.lop_days)}`],
                ['LOP deduction', rupees(payroll.lop_deduction)],
                ['Payable days', days(payroll.payable_days)],
                ['Present', days(payroll.present_days)],
                ['Pending days', days(payroll.pending_days)],
                ['Per-day salary', rupees(payroll.per_day_salary)],
                ['Prorated gross', rupees(payroll.prorated_gross)],
                ['Professional tax', rupees(payroll.professional_tax)],
                ['Provident fund', rupees(payroll.pf_amount)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 px-3 py-2">
                  <span className="block text-xs text-slate-400">{label}</span>
                  <span className="font-semibold text-slate-800">{value}</span>
                </div>
              ))}
            </div>
            {panel === 'edit' && !locked ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <AdminField label="Additional earnings"><input className={adminInputClass} value={extras.additional_earnings} onChange={(event) => setExtras({ ...extras, additional_earnings: event.target.value })} /></AdminField>
                <AdminField label="Other deductions"><input className={adminInputClass} value={extras.other_deductions} onChange={(event) => setExtras({ ...extras, other_deductions: event.target.value })} /></AdminField>
                <AdminButton variant="primary" onClick={() => post(`/api/admin/hr/payroll/${payroll.id}/extras`, extras, 'Payroll recalculated')}>Save extras</AdminButton>
              </div>
            ) : null}
            {panel === 'edit' && locked ? (
              <div className="mt-4 space-y-3">
                <AdminField label="Revision reason"><input className={adminInputClass} placeholder="Why this payroll is being reopened" value={reason} onChange={(event) => setReason(event.target.value)} /></AdminField>
                <div className="flex flex-wrap gap-2">
                  <AdminButton onClick={() => post(`/api/admin/hr/payroll/${payroll.id}/revise`, { reason }, 'Revision opened')}>Revise</AdminButton>
                  {payroll.status === 'approved' ? <AdminButton onClick={() => post('/api/admin/hr/payroll/paid', { ids: [payroll.id] }, 'Payroll marked paid')}>Mark paid</AdminButton> : null}
                </div>
              </div>
            ) : null}
            {events.length ? (
              <ul className="mt-4 space-y-1 text-xs text-slate-500">
                {events.map((event, index) => (
                  <li key={`${event.created_at}-${index}`}>{String(event.created_at || '').slice(0, 16).replace('T', ' ')} · {event.from_status || 'new'} → {event.to_status}{event.note ? ` · ${event.note}` : ''}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
