'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import AdminField, { adminInputClass, adminTextareaClass } from '@/components/admin/AdminField';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Icon from '@/components/ui/AppIcon';
import { formatINR, toCents } from '@/lib/finance/money';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const AVATARS = ['bg-rose-100 text-rose-600', 'bg-sky-100 text-sky-600', 'bg-violet-100 text-violet-600', 'bg-emerald-100 text-emerald-600', 'bg-amber-100 text-amber-600', 'bg-orange-100 text-orange-600'];

type Person = Record<string, string>;
type SlipRow = {
  id: string;
  name: string;
  code: string;
  department: string;
  gross: number | null;
  deductions: number | null;
  net: number | null;
  lop: number | null;
  tax: number | null;
  pf: number | null;
  other: number | null;
  status: 'generated' | 'pending' | 'not_generated';
  payslipId: string;
  generatedOn: string;
};

function shiftMonth(year: number, month: number, delta: number) {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

function monthEnd(year: number, month: number) {
  const day = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function coversMonth(employee: Person, year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = monthEnd(year, month);
  const joining = String(employee.date_of_joining || '').slice(0, 10);
  const left = String(employee.last_working_date || '').slice(0, 10);
  if (joining && joining > end) return false;
  if (left && left < start) return false;
  if ((employee.status || 'active') === 'inactive' && !left) return false;
  return true;
}

function rupees(cents: number | null) {
  if (cents == null) return '—';
  if (cents % 100 === 0) return `₹${(cents / 100).toLocaleString('en-IN')}`;
  return formatINR(cents);
}

function centsOf(value: unknown) {
  if (value == null || value === '') return 0;
  return toCents(value);
}

function stamp(value: unknown) {
  const text = String(value || '');
  const match = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  return `${match[3]} ${SHORT_MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '—';
}

function avatar(name: string) {
  const code = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATARS[code % AVATARS.length];
}

export default function PayslipsPage() {
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)));
  const [rows, setRows] = useState<SlipRow[]>([]);
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [menu, setMenu] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [headerOpen, setHeaderOpen] = useState(false);
  const [header, setHeader] = useState({
    payslip_logo_path: '',
    logo_path: '',
    payslip_header_right: 'Techantum Solutions\nA Unit of SJ Media Labs Pvt Ltd',
    payslip_signatory_name: '',
    payslip_signatory_title: '',
  });
  const [logoVersion, setLogoVersion] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const fileAction = useRef<{ id: string; mode: 'upload' | 'replace'; employeeId: string } | null>(null);

  const load = async (nextYear = year, nextMonth = month) => {
    setError('');
    const payrollParams = new URLSearchParams({ year: String(nextYear), month: String(nextMonth) });
    const slipParams = new URLSearchParams({ year: String(nextYear), month: String(nextMonth), page: '1', pageSize: '100' });
    const [payrollRes, slipRes, employeeRes, settingsRes] = await Promise.all([
      fetch(`/api/admin/hr/payroll?${payrollParams}`),
      fetch(`/api/admin/finance/payslips?${slipParams}`),
      fetch('/api/admin/finance/employees'),
      fetch('/api/admin/finance/settings'),
    ]);
    const payrollBody = await payrollRes.json();
    const slipBody = await slipRes.json();
    const employeeBody = await employeeRes.json();
    const settingsBody = await settingsRes.json();
    if (!payrollRes.ok) {
      setError(payrollBody.error || 'Could not load payroll');
      return;
    }
    if (!slipRes.ok) {
      setError(slipBody.error || 'Could not load payslips');
      return;
    }
    if (settingsBody && !settingsBody.error) {
      setHeader({
        payslip_logo_path: settingsBody.payslip_logo_path || '',
        logo_path: settingsBody.logo_path || '',
        payslip_header_right: settingsBody.payslip_header_right || 'Techantum Solutions\nA Unit of SJ Media Labs Pvt Ltd',
        payslip_signatory_name: settingsBody.payslip_signatory_name || '',
        payslip_signatory_title: settingsBody.payslip_signatory_title || '',
      });
    }
    const payrollRows = (payrollBody.rows || []) as Person[];
    const slipRows = (slipBody.rows || []) as Person[];
    const employees = (Array.isArray(employeeBody) ? employeeBody : []) as Person[];
    const payrollById = new Map(payrollRows.map((row) => [row.employee_id, row]));
    const slipById = new Map(slipRows.map((row) => [row.employee_id, row]));
    const people = new Map(employees.map((employee) => [employee.id, employee]));
    for (const row of [...payrollRows, ...slipRows]) {
      if (!people.has(row.employee_id)) {
        people.set(row.employee_id, {
          id: row.employee_id,
          full_name: row.full_name || row.employee_name || '',
          employee_code: row.employee_code || '',
          department: row.department || '',
          status: 'active',
        });
      }
    }
    const next: SlipRow[] = [];
    for (const employee of people.values()) {
      const payroll = payrollById.get(employee.id);
      const slip = slipById.get(employee.id);
      if (!payroll && !slip && !coversMonth(employee, nextYear, nextMonth)) continue;
      const payslipId = slip?.id || payroll?.payslip_id || '';
      const deductions = payroll
        ? centsOf(payroll.lop_deduction) + centsOf(payroll.professional_tax) + centsOf(payroll.pf_amount) + centsOf(payroll.other_deductions)
        : slip?.gross_deduction != null ? centsOf(slip.gross_deduction) : null;
      next.push({
        id: employee.id,
        name: employee.full_name || payroll?.full_name || slip?.employee_name || '',
        code: employee.employee_code || payroll?.employee_code || slip?.employee_code || '',
        department: employee.department || payroll?.department || slip?.department || '',
        gross: payroll?.monthly_gross != null ? centsOf(payroll.monthly_gross) : slip?.gross_earning != null ? centsOf(slip.gross_earning) : null,
        deductions,
        net: payroll?.net_payable != null ? centsOf(payroll.net_payable) : slip?.net_pay != null ? centsOf(slip.net_pay) : null,
        lop: payroll ? centsOf(payroll.lop_deduction) : null,
        tax: payroll ? centsOf(payroll.professional_tax) : null,
        pf: payroll ? centsOf(payroll.pf_amount) : null,
        other: payroll ? centsOf(payroll.other_deductions) : null,
        status: payslipId ? 'generated' : payroll ? 'pending' : 'not_generated',
        payslipId,
        generatedOn: stamp(slip?.payslip_date || slip?.uploaded_at),
      });
    }
    next.sort((a, b) => a.name.localeCompare(b.name));
    setRows(next);
    setSelected([]);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const departments = useMemo(() => [...new Set(rows.map((row) => row.department).filter(Boolean))].sort(), [rows]);
  const visible = rows.filter((row) => {
    if (department && row.department !== department) return false;
    if (status && row.status !== status) return false;
    const text = query.trim().toLowerCase();
    if (!text) return true;
    return `${row.name} ${row.code}`.toLowerCase().includes(text);
  });
  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * pageSize;
  const pageRows = visible.slice(start, start + pageSize);
  const pageIds = pageRows.map((row) => row.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const generated = rows.filter((row) => row.status === 'generated').length;
  const pending = rows.filter((row) => row.status === 'pending').length;
  const missing = rows.filter((row) => row.status === 'not_generated').length;
  const totalPayroll = rows.reduce((sum, row) => sum + (row.gross || 0), 0);

  const move = (delta: number) => {
    const next = shiftMonth(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
    setPage(1);
  };

  const generateFor = async (targets: SlipRow[], revise = false) => {
    if (!targets.length) {
      setError(revise ? 'Select a generated payslip to regenerate.' : 'Every selected employee already has a payslip.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    const failures: string[] = [];
    let saved = 0;
    for (const row of targets) {
      const response = await fetch('/api/admin/finance/payslips/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: row.id, payroll_month: month, payroll_year: year, revise }),
      });
      const body = await response.json();
      if (!response.ok) failures.push(`${row.name}: ${body.error || 'Could not generate payslip'}`);
      else saved += 1;
    }
    setBusy(false);
    await load();
    if (saved) setMessage(saved === 1 ? 'Payslip generated.' : `${saved} payslips generated.`);
    if (failures.length) setError(failures.slice(0, 4).join(' '));
  };

  const generateSelected = () => {
    const chosen = selected.length ? rows.filter((row) => selected.includes(row.id)) : rows;
    void generateFor(chosen.filter((row) => row.status !== 'generated'));
  };

  const uploadFile = async (file: File) => {
    const action = fileAction.current;
    fileAction.current = null;
    if (!action) return;
    setError('');
    setMessage('');
    const data = new FormData();
    data.set('file', file);
    const path = action.mode === 'replace'
      ? `/api/admin/finance/payslips/${action.id}/replace`
      : '/api/admin/finance/payslips';
    if (action.mode === 'upload') {
      data.set('employee_id', action.employeeId);
      data.set('payroll_month', String(month));
      data.set('payroll_year', String(year));
      data.set('payslip_date', monthEnd(year, month));
    }
    const response = await fetch(path, { method: 'POST', body: data });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || 'Could not save the payslip PDF');
      return;
    }
    setMessage(action.mode === 'replace' ? 'Payslip replaced.' : 'Payslip uploaded.');
    await load();
  };

  const remove = async (row: SlipRow) => {
    if (!row.payslipId || !window.confirm(`Delete the payslip for ${row.name}?`)) return;
    setMenu('');
    const response = await fetch(`/api/admin/finance/payslips/${row.payslipId}`, { method: 'DELETE' });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error || 'Could not delete payslip');
      return;
    }
    setMessage('Payslip deleted.');
    await load();
  };

  const saveHeader = async () => {
    setError('');
    setMessage('');
    const response = await fetch('/api/admin/finance/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payslip_header_right: header.payslip_header_right,
        payslip_signatory_name: header.payslip_signatory_name,
        payslip_signatory_title: header.payslip_signatory_title,
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || 'Could not save payslip header');
      return;
    }
    setMessage('Payslip header saved. New payslips use this logo and signature.');
    setHeaderOpen(false);
  };

  const uploadLogo = async (file: File) => {
    const data = new FormData();
    data.set('file', file);
    data.set('field', 'payslip_logo_path');
    const response = await fetch('/api/admin/finance/settings/file', { method: 'POST', body: data });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || 'Could not upload logo');
      return;
    }
    setHeader((current) => ({ ...current, payslip_logo_path: body.payslip_logo_path || current.payslip_logo_path }));
    setLogoVersion((value) => value + 1);
    setMessage('Payslip logo updated.');
  };

  const pickFile = (row: SlipRow, mode: 'upload' | 'replace') => {
    fileAction.current = { id: row.payslipId, mode, employeeId: row.id };
    setMenu('');
    fileRef.current?.click();
  };

  const logoField = header.payslip_logo_path ? 'payslip_logo_path' : header.logo_path ? 'logo_path' : '';
  const cards = [
    ['Total Employees', String(rows.length), 'bg-sky-50 text-sky-600', 'UsersIcon'],
    ['Payslips Generated', String(generated), 'bg-emerald-50 text-emerald-600', 'CheckCircleIcon'],
    ['Pending', String(pending), 'bg-amber-50 text-amber-600', 'ClockIcon'],
    ['Not Generated', String(missing), 'bg-rose-50 text-rose-600', 'XCircleIcon'],
    ['Total Payroll', rupees(totalPayroll), 'bg-violet-50 text-violet-600', 'CurrencyRupeeIcon'],
  ];

  return (
    <div className="space-y-4">
      <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) void uploadFile(file);
      }} />
      <AdminPageHeader
        kicker="Human Resources"
        title="Payslips"
        description="Generate and manage employee payslips based on attendance. Loss of pay is deducted for unpaid leaves and other adjustments."
        action={
          <div className="flex items-center gap-2">
            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500" aria-label="Previous month" onClick={() => move(-1)}><Icon name="ChevronLeftIcon" size={18} /></button>
            <span className="inline-flex h-11 min-w-[160px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800">
              <Icon name="CalendarDaysIcon" size={16} className="text-slate-400" />
              {MONTHS[month - 1]} {year}
            </span>
            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500" aria-label="Next month" onClick={() => move(1)}><Icon name="ChevronRightIcon" size={18} /></button>
            <AdminButton variant="primary" disabled={busy} onClick={generateSelected}>{busy ? 'Generating...' : 'Generate Payslips'}</AdminButton>
          </div>
        }
      />
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {cards.map(([label, value, tone, icon]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs text-slate-500">{label}</span>
              <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${tone}`}><Icon name={icon} size={16} /></span>
            </div>
            <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
          </div>
        ))}
        <Link href="/admin/hr/payroll" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-800 shadow-sm hover:border-secondary/40">
          <span className="flex items-center gap-2"><Icon name="DocumentTextIcon" size={18} className="text-slate-400" /> View Payroll Summary</span>
          <Icon name="ChevronRightIcon" size={16} className="text-slate-400" />
        </Link>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <label className="relative min-w-[240px] flex-1">
          <Icon name="MagnifyingGlassIcon" className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} />
          <input className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-secondary" placeholder="Search by name or employee ID..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
        </label>
        <select className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm" value={department} onChange={(event) => { setDepartment(event.target.value); setPage(1); }}>
          <option value="">All Departments</option>
          {departments.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="generated">Generated</option>
          <option value="pending">Pending</option>
          <option value="not_generated">Not Generated</option>
        </select>
        <button type="button" className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600" onClick={() => { setQuery(''); setDepartment(''); setStatus(''); setPage(1); }}>
          <Icon name="ArrowPathIcon" size={16} /> Clear
        </button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3"><input type="checkbox" aria-label="Select page" checked={allPageSelected} onChange={() => setSelected((current) => allPageSelected ? current.filter((id) => !pageIds.includes(id)) : [...new Set([...current, ...pageIds])])} /></th>
                <th className="px-3 py-3">Employee</th>
                <th className="px-3 py-3">Department</th>
                <th className="px-3 py-3">Gross Salary</th>
                <th className="px-3 py-3">
                  <span className="inline-flex items-center gap-1">Deductions <span title="Loss of pay, professional tax, provident fund, and other deductions."><Icon name="InformationCircleIcon" size={14} /></span></span>
                </th>
                <th className="px-3 py-3">Net Payable</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3"><input type="checkbox" aria-label={`Select ${row.name}`} checked={selected.includes(row.id)} onChange={() => setSelected((current) => current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id])} /></td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${avatar(row.name)}`}>{initials(row.name)}</span>
                      <span>
                        <span className="block font-semibold text-slate-900">{row.name}</span>
                        <span className="block text-xs text-slate-400">{row.code}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{row.department || '—'}</td>
                  <td className="px-3 py-3">{rupees(row.gross)}</td>
                  <td className="px-3 py-3" title={row.deductions == null ? undefined : `LOP ${rupees(row.lop)} · Tax ${rupees(row.tax)} · PF ${rupees(row.pf)} · Other ${rupees(row.other)}`}>{rupees(row.deductions)}</td>
                  <td className="px-3 py-3 font-medium">{rupees(row.net)}</td>
                  <td className="px-3 py-3">
                    {row.status === 'generated' ? (
                      <span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><Icon name="CheckCircleIcon" size={14} /> Generated</span>
                        {row.generatedOn ? <span className="mt-1 block text-[11px] text-slate-400">{row.generatedOn}</span> : null}
                      </span>
                    ) : row.status === 'pending' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"><Icon name="ClockIcon" size={14} /> Pending</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600"><Icon name="XCircleIcon" size={14} /> Not Generated</span>
                    )}
                  </td>
                  <td className="relative px-3 py-3">
                    <div className="flex items-center gap-2">
                      {row.status === 'generated' ? (
                        <a className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50" href={`/api/admin/finance/payslips/${row.payslipId}/download`} target="_blank" rel="noreferrer">
                          <Icon name="EyeIcon" size={14} /> View
                        </a>
                      ) : (
                        <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50" disabled={busy} onClick={() => generateFor([row])}>
                          <Icon name="DocumentTextIcon" size={14} /> Generate
                        </button>
                      )}
                      <button type="button" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="More actions" onClick={() => setMenu(menu === row.id ? '' : row.id)}><Icon name="EllipsisVerticalIcon" size={16} /></button>
                    </div>
                    {menu === row.id ? (
                      <div className="absolute right-3 z-10 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg">
                        {row.payslipId ? <a className="block px-3 py-2 hover:bg-slate-50" href={`/api/admin/finance/payslips/${row.payslipId}/download`}>Download</a> : null}
                        {row.payslipId ? <button type="button" className="block w-full px-3 py-2 text-left hover:bg-slate-50" onClick={() => generateFor([row], true)}>Regenerate</button> : null}
                        <button type="button" className="block w-full px-3 py-2 text-left hover:bg-slate-50" onClick={() => pickFile(row, row.payslipId ? 'replace' : 'upload')}>{row.payslipId ? 'Replace PDF' : 'Upload PDF'}</button>
                        {row.payslipId ? <button type="button" className="block w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50" onClick={() => remove(row)}>Delete</button> : null}
                        <button type="button" className="block w-full px-3 py-2 text-left hover:bg-slate-50" onClick={() => { setMenu(''); setHeaderOpen(true); }}>Payslip header</button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
              {!pageRows.length ? <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">No employees match this month.</td></tr> : null}
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

      {headerOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/30 p-4 sm:items-center" onClick={() => setHeaderOpen(false)}>
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <h2 className="font-bricolage text-lg font-bold text-slate-900">Payslip header</h2>
            <p className="mt-1 text-sm text-slate-500">Logo, company lines, and the signature used on generated payslips.</p>
            <div className="mt-4 space-y-3">
              {logoField ? <img src={`/api/admin/finance/settings/file/${logoField}?v=${logoVersion}`} alt="Payslip logo" className="h-12 w-auto max-w-[220px] object-contain object-left" /> : null}
              <AdminField label="Logo" hint="PNG or JPG. Shown at the top left.">
                <input type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" onChange={(event) => event.target.files?.[0] && uploadLogo(event.target.files[0])} />
              </AdminField>
              <AdminField label="Right side content" hint="First line is the company name.">
                <textarea className={adminTextareaClass} rows={3} value={header.payslip_header_right} onChange={(event) => setHeader({ ...header, payslip_header_right: event.target.value })} />
              </AdminField>
              <AdminField label="Authorised signature name">
                <input className={adminInputClass} value={header.payslip_signatory_name} onChange={(event) => setHeader({ ...header, payslip_signatory_name: event.target.value })} />
              </AdminField>
              <AdminField label="Signatory designation">
                <input className={adminInputClass} value={header.payslip_signatory_title} onChange={(event) => setHeader({ ...header, payslip_signatory_title: event.target.value })} />
              </AdminField>
            </div>
            <div className="mt-4 flex gap-2">
              <AdminButton variant="primary" onClick={saveHeader}>Save header</AdminButton>
              <AdminButton onClick={() => setHeaderOpen(false)}>Close</AdminButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
