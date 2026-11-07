'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import AdminField, { adminInputClass, adminTextareaClass } from '@/components/admin/AdminField';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatusModal from '@/components/admin/AdminStatusModal';
import Icon from '@/components/ui/AppIcon';
import { formatINR, toCents } from '@/lib/finance/money';
import { HrSalary } from '@/components/admin/hr/HrSalary';

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
  email: string;
  gross: number | null;
  deductions: number | null;
  net: number | null;
  lop: number | null;
  tax: number | null;
  pf: number | null;
  other: number | null;
  status: 'generated' | 'pending';
  payslipId: string;
  generatedOn: string;
  canGenerate: boolean;
};

type DrawerPerson = {
  id: string;
  name: string;
  code: string;
  department: string;
  hasPayslip: boolean;
  canGenerate: boolean;
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

function buildRows(payrollRows: Person[], slipRows: Person[], employees: Person[], year: number, month: number): SlipRow[] {
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
        email: row.email || '',
        status: 'active',
      });
    }
  }
  const next: SlipRow[] = [];
  for (const employee of people.values()) {
    const payroll = payrollById.get(employee.id);
    const slip = slipById.get(employee.id);
    if (!payroll && !slip && !coversMonth(employee, year, month)) continue;
    const payslipId = slip?.id || payroll?.payslip_id || '';
    const deductions = payroll
      ? centsOf(payroll.lop_deduction) + centsOf(payroll.professional_tax) + centsOf(payroll.pf_amount) + centsOf(payroll.other_deductions)
      : slip?.gross_deduction != null
        ? centsOf(slip.gross_deduction)
        : null;
    const approved = payroll?.status === 'approved' || payroll?.status === 'paid';
    next.push({
      id: employee.id,
      name: employee.full_name || payroll?.full_name || slip?.employee_name || '',
      code: employee.employee_code || payroll?.employee_code || slip?.employee_code || '',
      department: employee.department || payroll?.department || slip?.department || '',
      email: employee.email || '',
      gross: payroll?.monthly_gross != null ? centsOf(payroll.monthly_gross) : slip?.gross_earning != null ? centsOf(slip.gross_earning) : null,
      deductions,
      net: payroll?.net_payable != null ? centsOf(payroll.net_payable) : slip?.net_pay != null ? centsOf(slip.net_pay) : null,
      lop: payroll ? centsOf(payroll.lop_deduction) : null,
      tax: payroll ? centsOf(payroll.professional_tax) : null,
      pf: payroll ? centsOf(payroll.pf_amount) : null,
      other: payroll ? centsOf(payroll.other_deductions) : null,
      status: payslipId ? 'generated' : 'pending',
      payslipId,
      generatedOn: stamp(slip?.payslip_date || slip?.uploaded_at),
      canGenerate: !payslipId && Boolean(approved),
    });
  }
  next.sort((a, b) => a.name.localeCompare(b.name));
  return next;
}

export default function PayslipsPage() {
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)));
  const [rows, setRows] = useState<SlipRow[]>([]);
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [tab, setTab] = useState<'employees' | 'generated'>('employees');
  const [page, setPage] = useState(1);
  const [menu, setMenu] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerYear, setDrawerYear] = useState(Number(today.slice(0, 4)));
  const [drawerMonth, setDrawerMonth] = useState(Number(today.slice(5, 7)));
  const [drawerPeople, setDrawerPeople] = useState<DrawerPerson[]>([]);
  const [drawerSelected, setDrawerSelected] = useState<string[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [headerOpen, setHeaderOpen] = useState(false);
  const [header, setHeader] = useState({
    payslip_logo_path: '',
    logo_path: '',
    payslip_header_right: 'Techantum Solutions\nA Unit of SJ Media Labs Pvt Ltd',
    payslip_signatory_name: '',
    payslip_signatory_title: '',
  });
  const [logoVersion, setLogoVersion] = useState(0);
  const [statusModal, setStatusModal] = useState<{ title: string; message: string; variant: 'success' | 'error' } | null>(null);
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
    setRows(buildRows(payrollBody.rows || [], slipBody.rows || [], Array.isArray(employeeBody) ? employeeBody : [], nextYear, nextMonth));
  };

  const loadDrawer = async (nextYear: number, nextMonth: number) => {
    setDrawerLoading(true);
    const payrollParams = new URLSearchParams({ year: String(nextYear), month: String(nextMonth) });
    const slipParams = new URLSearchParams({ year: String(nextYear), month: String(nextMonth), page: '1', pageSize: '100' });
    const [payrollRes, slipRes, employeeRes] = await Promise.all([
      fetch(`/api/admin/hr/payroll?${payrollParams}`),
      fetch(`/api/admin/finance/payslips?${slipParams}`),
      fetch('/api/admin/finance/employees'),
    ]);
    const payrollBody = await payrollRes.json();
    const slipBody = await slipRes.json();
    const employeeBody = await employeeRes.json();
    setDrawerLoading(false);
    if (!payrollRes.ok || !slipRes.ok) {
      setDrawerPeople([]);
      setDrawerSelected([]);
      return;
    }
    const built = buildRows(payrollBody.rows || [], slipBody.rows || [], Array.isArray(employeeBody) ? employeeBody : [], nextYear, nextMonth);
    setDrawerPeople(
      built.map((row) => ({
        id: row.id,
        name: row.name,
        code: row.code,
        department: row.department,
        hasPayslip: row.status === 'generated',
        canGenerate: row.canGenerate,
      }))
    );
    setDrawerSelected(built.filter((row) => row.canGenerate).map((row) => row.id));
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  useEffect(() => {
    if (!drawerOpen) return;
    void loadDrawer(drawerYear, drawerMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerOpen, drawerYear, drawerMonth]);

  const departments = useMemo(() => [...new Set(rows.map((row) => row.department).filter(Boolean))].sort(), [rows]);
  const generatedRows = rows.filter((row) => row.status === 'generated');
  const pendingCount = rows.filter((row) => row.status === 'pending').length;
  const generatedCount = generatedRows.length;
  const totalPayroll = rows.reduce((sum, row) => sum + (row.net ?? row.gross ?? 0), 0);

  const sourceRows = tab === 'generated' ? generatedRows : rows;
  const visible = sourceRows.filter((row) => {
    if (department && row.department !== department) return false;
    if (tab === 'employees' && status && row.status !== status) return false;
    const text = query.trim().toLowerCase();
    if (!text) return true;
    return `${row.name} ${row.code} ${row.email}`.toLowerCase().includes(text);
  });
  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * pageSize;
  const pageRows = visible.slice(start, start + pageSize);

  const eligibleDrawer = drawerPeople.filter((person) => person.canGenerate);
  const drawerAllSelected = eligibleDrawer.length > 0 && eligibleDrawer.every((person) => drawerSelected.includes(person.id));

  const move = (delta: number) => {
    const next = shiftMonth(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
    setPage(1);
  };

  const openDrawer = () => {
    setDrawerYear(year);
    setDrawerMonth(month);
    setDrawerOpen(true);
  };

  const generateFor = async (targets: { id: string; name: string }[], genYear: number, genMonth: number, revise = false) => {
    if (!targets.length) {
      setStatusModal({
        title: revise ? 'Nothing to regenerate' : 'Nothing to generate',
        message: revise ? 'Select a generated payslip to regenerate.' : 'Every selected employee already has a payslip for this month.',
        variant: 'error',
      });
      return;
    }
    setBusy(true);
    setError('');
    const failures: string[] = [];
    let saved = 0;
    let skipped = 0;
    for (const row of targets) {
      const response = await fetch('/api/admin/finance/payslips/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: row.id, payroll_month: genMonth, payroll_year: genYear, revise }),
      });
      const body = await response.json();
      if (!response.ok) {
        const message = String(body.error || 'Could not generate payslip');
        if (/already exists/i.test(message) && !revise) {
          skipped += 1;
          continue;
        }
        failures.push(`${row.name}: ${message}`);
      } else {
        saved += 1;
      }
    }
    setBusy(false);
    await load();
    if (drawerOpen) await loadDrawer(drawerYear, drawerMonth);
    if (saved || skipped) {
      const parts = [];
      if (saved) parts.push(saved === 1 ? '1 payslip generated' : `${saved} payslips generated`);
      if (skipped) parts.push(skipped === 1 ? '1 already existed and was skipped' : `${skipped} already existed and were skipped`);
      setStatusModal({ title: 'Payslips ready', message: `${parts.join('. ')}.`, variant: failures.length ? 'error' : 'success' });
      if (saved) setDrawerOpen(false);
    }
    if (failures.length) {
      setError(failures.slice(0, 4).join(' '));
      if (!saved && !skipped) setStatusModal({ title: 'Generate failed', message: failures.slice(0, 3).join(' '), variant: 'error' });
    }
  };

  const generateFromDrawer = () => {
    const chosen = drawerPeople.filter((person) => drawerSelected.includes(person.id) && person.canGenerate);
    void generateFor(chosen, drawerYear, drawerMonth, false);
  };

  const emailPayslip = async (row: SlipRow) => {
    if (!row.payslipId) return;
    setMenu('');
    if (!row.email) {
      setStatusModal({
        title: 'Email missing',
        message: `${row.name} has no email saved on their employee profile.`,
        variant: 'error',
      });
      return;
    }
    setBusy(true);
    setError('');
    const response = await fetch(`/api/admin/finance/payslips/${row.payslipId}/email`, { method: 'POST' });
    const body = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      const next = String(body.error || 'Could not email the payslip');
      setError(next);
      setStatusModal({ title: 'Email failed', message: next, variant: 'error' });
      return;
    }
    setStatusModal({
      title: 'Payslip emailed',
      message: `Sent to ${body.to || row.email} from hr@techantum.com.`,
      variant: 'success',
    });
  };

  const uploadFile = async (file: File) => {
    const action = fileAction.current;
    fileAction.current = null;
    if (!action) return;
    setError('');
    const data = new FormData();
    data.set('file', file);
    const path = action.mode === 'replace' ? `/api/admin/finance/payslips/${action.id}/replace` : '/api/admin/finance/payslips';
    if (action.mode === 'upload') {
      data.set('employee_id', action.employeeId);
      data.set('payroll_month', String(month));
      data.set('payroll_year', String(year));
      data.set('payslip_date', monthEnd(year, month));
    }
    const response = await fetch(path, { method: 'POST', body: data });
    const body = await response.json();
    if (!response.ok) {
      const next = body.error || 'Could not save the payslip PDF';
      setError(next);
      setStatusModal({ title: 'Upload failed', message: next, variant: 'error' });
      return;
    }
    setStatusModal({
      title: action.mode === 'replace' ? 'Payslip replaced' : 'Payslip uploaded',
      message: action.mode === 'replace' ? 'The PDF was replaced successfully.' : 'The PDF was uploaded successfully.',
      variant: 'success',
    });
    await load();
  };

  const remove = async (row: SlipRow) => {
    if (!row.payslipId || !window.confirm(`Delete the payslip for ${row.name}?`)) return;
    setMenu('');
    const response = await fetch(`/api/admin/finance/payslips/${row.payslipId}`, { method: 'DELETE' });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const next = body.error || 'Could not delete payslip';
      setError(next);
      setStatusModal({ title: 'Delete failed', message: next, variant: 'error' });
      return;
    }
    setStatusModal({ title: 'Payslip deleted', message: `Payslip for ${row.name} was removed.`, variant: 'success' });
    await load();
  };

  const saveHeader = async () => {
    setError('');
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
      const next = body.error || 'Could not save payslip header';
      setError(next);
      setStatusModal({ title: 'Save failed', message: next, variant: 'error' });
      return;
    }
    setHeaderOpen(false);
    setStatusModal({ title: 'Header saved', message: 'New payslips will use this logo and signature.', variant: 'success' });
  };

  const uploadLogo = async (file: File) => {
    const data = new FormData();
    data.set('file', file);
    data.set('field', 'payslip_logo_path');
    const response = await fetch('/api/admin/finance/settings/file', { method: 'POST', body: data });
    const body = await response.json();
    if (!response.ok) {
      setStatusModal({ title: 'Upload failed', message: body.error || 'Could not upload logo', variant: 'error' });
      return;
    }
    setHeader((current) => ({ ...current, payslip_logo_path: body.payslip_logo_path || current.payslip_logo_path }));
    setLogoVersion((value) => value + 1);
    setStatusModal({ title: 'Logo updated', message: 'Payslip logo was updated.', variant: 'success' });
  };

  const pickFile = (row: SlipRow, mode: 'upload' | 'replace') => {
    fileAction.current = { id: row.payslipId, mode, employeeId: row.id };
    setMenu('');
    fileRef.current?.click();
  };

  const logoField = header.payslip_logo_path ? 'payslip_logo_path' : header.logo_path ? 'logo_path' : '';
  const periodLabel = `${MONTHS[month - 1]} ${year}`;
  const drawerPeriodLabel = `${MONTHS[drawerMonth - 1]} ${drawerYear}`;
  const yearOptions = Array.from({ length: 7 }, (_, index) => Number(today.slice(0, 4)) - 3 + index);

  return (
    <div className="space-y-5">
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void uploadFile(file);
        }}
      />

      <div className="text-xs font-medium text-slate-400">
        HR <span className="mx-1.5 text-slate-300">/</span> Payroll <span className="mx-1.5 text-slate-300">/</span> <span className="text-slate-600">Payslips</span>
      </div>

      <AdminPageHeader
        title="Payslips"
        description="Create, manage and download employee payslips."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white">
              <button type="button" className="flex h-11 w-10 items-center justify-center text-slate-500 hover:bg-slate-50" aria-label="Previous month" onClick={() => move(-1)}>
                <Icon name="ChevronLeftIcon" size={18} />
              </button>
              <span className="inline-flex min-w-[148px] items-center justify-center gap-2 px-2 text-sm font-semibold text-slate-800">
                <Icon name="CalendarDaysIcon" size={16} className="text-slate-400" />
                {periodLabel}
              </span>
              <button type="button" className="flex h-11 w-10 items-center justify-center text-slate-500 hover:bg-slate-50" aria-label="Next month" onClick={() => move(1)}>
                <Icon name="ChevronRightIcon" size={18} />
              </button>
            </div>
            <AdminButton variant="primary" disabled={busy} onClick={openDrawer}>
              + Generate Payslips
            </AdminButton>
          </div>
        }
      />

      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Total Employees', String(rows.length), 'UsersIcon', 'bg-slate-100 text-slate-600'],
          ['Payslips Generated', String(generatedCount), 'CheckCircleIcon', 'bg-emerald-50 text-emerald-600'],
          ['Pending', String(pendingCount), 'ClockIcon', 'bg-amber-50 text-amber-600'],
          [`Total Payroll (${SHORT_MONTHS[month - 1]} ${year})`, <HrSalary key="payroll" value={totalPayroll} asCents />, 'CurrencyRupeeIcon', 'bg-rose-50 text-rose-600'],
        ].map(([label, value, icon, tone]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{value}</p>
              </div>
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
                <Icon name={String(icon)} size={18} />
              </span>
            </div>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 pt-3">
          <div className="flex gap-1">
            {(
              [
                ['employees', `Employees (${rows.length})`],
                ['generated', `Generated Payslips (${generatedCount})`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`border-b-2 px-3 pb-3 text-sm font-semibold transition-colors ${
                  tab === id ? 'border-secondary text-secondary' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
                onClick={() => {
                  setTab(id);
                  setPage(1);
                  setMenu('');
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <button type="button" className="mb-2 text-xs font-semibold text-slate-500 hover:text-slate-800" onClick={() => setHeaderOpen(true)}>
            Payslip header
          </button>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 lg:flex-row lg:items-center">
          <label className="relative min-w-[240px] flex-1">
            <Icon name="MagnifyingGlassIcon" className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} />
            <input
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-3 text-sm outline-none focus:border-secondary focus:bg-white"
              placeholder="Search by name, employee ID or email..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <select
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
            value={department}
            onChange={(event) => {
              setDepartment(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All Departments</option>
            {departments.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          {tab === 'employees' ? (
            <select
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All Status</option>
              <option value="generated">Generated</option>
              <option value="pending">Pending</option>
            </select>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Employee</th>
                <th className="px-3 py-3">Department</th>
                <th className="px-3 py-3">Gross Salary</th>
                <th className="px-3 py-3">Net Payable</th>
                <th className="px-3 py-3">Payslip Status</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${avatar(row.name)}`}>{initials(row.name)}</span>
                      <span>
                        <span className="block font-semibold text-slate-900">{row.name}</span>
                        <span className="block text-xs text-slate-400">{row.code}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{row.department || '—'}</td>
                  <td className="px-3 py-3">
                    <HrSalary value={row.gross} asCents />
                  </td>
                  <td className="px-3 py-3 font-medium">
                    <HrSalary value={row.net} asCents />
                  </td>
                  <td className="px-3 py-3">
                    {row.status === 'generated' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <Icon name="CheckCircleIcon" size={14} />
                        Generated{row.generatedOn ? ` · ${row.generatedOn}` : ''}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        <Icon name="ClockIcon" size={14} />
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="relative px-3 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {row.status === 'generated' ? (
                        <>
                          <a
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white"
                            href={`/api/admin/finance/payslips/${row.payslipId}/download`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Icon name="ArrowDownTrayIcon" size={14} /> Download
                          </a>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white disabled:opacity-50"
                            disabled={busy}
                            title={row.email ? `Email to ${row.email}` : 'No employee email saved'}
                            onClick={() => void emailPayslip(row)}
                          >
                            <Icon name="EnvelopeIcon" size={14} /> Email
                          </button>
                        </>
                      ) : row.canGenerate ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                          disabled={busy}
                          onClick={() => generateFor([{ id: row.id, name: row.name }], year, month)}
                        >
                          Generate
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400" title="Approve payroll first">
                          Awaiting payroll
                        </span>
                      )}
                      <button type="button" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="More actions" onClick={() => setMenu(menu === row.id ? '' : row.id)}>
                        <Icon name="EllipsisVerticalIcon" size={16} />
                      </button>
                    </div>
                    {menu === row.id ? (
                      <div className="absolute right-3 z-20 mt-1 w-48 rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg">
                        {row.payslipId ? (
                          <a className="block px-3 py-2 hover:bg-slate-50" href={`/api/admin/finance/payslips/${row.payslipId}/download`}>
                            Download
                          </a>
                        ) : null}
                        {row.payslipId ? (
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-50"
                            disabled={busy}
                            onClick={() => void emailPayslip(row)}
                          >
                            Send to email{row.email ? '' : ' (no email)'}
                          </button>
                        ) : null}
                        {row.payslipId ? (
                          <button type="button" className="block w-full px-3 py-2 text-left hover:bg-slate-50" onClick={() => generateFor([{ id: row.id, name: row.name }], year, month, true)}>
                            Regenerate
                          </button>
                        ) : null}
                        <button type="button" className="block w-full px-3 py-2 text-left hover:bg-slate-50" onClick={() => pickFile(row, row.payslipId ? 'replace' : 'upload')}>
                          {row.payslipId ? 'Replace PDF' : 'Upload PDF'}
                        </button>
                        {row.payslipId ? (
                          <button type="button" className="block w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50" onClick={() => remove(row)}>
                            Delete
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
              {!pageRows.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                    {tab === 'generated' ? 'No payslips generated for this month yet.' : 'No employees match this month.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <p>
            Showing {visible.length ? start + 1 : 0}–{Math.min(start + pageSize, visible.length)} of {visible.length}
          </p>
          <div className="flex items-center gap-1">
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50" aria-label="Previous page" onClick={() => setPage(Math.max(1, currentPage - 1))}>
              <Icon name="ChevronLeftIcon" size={16} />
            </button>
            {Array.from({ length: pages }, (_, index) => index + 1)
              .slice(0, 5)
              .map((number) => (
                <button key={number} type="button" className={`h-8 w-8 rounded-lg text-sm ${number === currentPage ? 'bg-secondary font-semibold text-white' : 'text-slate-500 hover:bg-slate-50'}`} onClick={() => setPage(number)}>
                  {number}
                </button>
              ))}
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50" aria-label="Next page" onClick={() => setPage(Math.min(pages, currentPage + 1))}>
              <Icon name="ChevronRightIcon" size={16} />
            </button>
          </div>
        </div>
      </section>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/35" onClick={() => !busy && setDrawerOpen(false)}>
          <aside className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                  <Icon name="DocumentDuplicateIcon" size={20} />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Generate Payslips</h2>
                  <p className="mt-0.5 text-sm text-slate-500">Create payslips for selected employees</p>
                </div>
              </div>
              <button type="button" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close" disabled={busy} onClick={() => setDrawerOpen(false)}>
                <Icon name="XMarkIcon" size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Month & Year</span>
                <div className="grid grid-cols-2 gap-2">
                  <select className="h-11 rounded-xl border border-slate-200 px-3 text-sm" value={drawerMonth} onChange={(event) => setDrawerMonth(Number(event.target.value))} disabled={busy}>
                    {MONTHS.map((name, index) => (
                      <option key={name} value={index + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <select className="h-11 rounded-xl border border-slate-200 px-3 text-sm" value={drawerYear} onChange={(event) => setDrawerYear(Number(event.target.value))} disabled={busy}>
                    {yearOptions.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-700">Select Employees</span>
                  <span className="text-xs text-slate-400">
                    {drawerSelected.length} of {eligibleDrawer.length} selected
                  </span>
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <label className="flex cursor-pointer items-center gap-3 border-b border-slate-100 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={drawerAllSelected}
                      disabled={!eligibleDrawer.length || busy || drawerLoading}
                      onChange={() => setDrawerSelected(drawerAllSelected ? [] : eligibleDrawer.map((person) => person.id))}
                    />
                    Select All
                  </label>
                  <div className="max-h-[360px] overflow-y-auto">
                    {drawerLoading ? <p className="px-3 py-8 text-center text-sm text-slate-500">Loading employees...</p> : null}
                    {!drawerLoading && !drawerPeople.length ? <p className="px-3 py-8 text-center text-sm text-slate-500">No employees for this month.</p> : null}
                    {!drawerLoading
                      ? drawerPeople.map((person) => {
                          const locked = person.hasPayslip || !person.canGenerate;
                          return (
                            <label
                              key={person.id}
                              className={`flex items-center gap-3 border-t border-slate-50 px-3 py-2.5 text-sm ${locked ? 'cursor-default bg-slate-50/70 opacity-80' : 'cursor-pointer hover:bg-slate-50'}`}
                            >
                              <input
                                type="checkbox"
                                checked={drawerSelected.includes(person.id)}
                                disabled={locked || busy}
                                onChange={() =>
                                  setDrawerSelected((current) => (current.includes(person.id) ? current.filter((id) => id !== person.id) : [...current, person.id]))
                                }
                              />
                              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold ${avatar(person.name)}`}>{initials(person.name)}</span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium text-slate-900">{person.name}</span>
                                <span className="block truncate text-xs text-slate-400">
                                  {person.code}
                                  {person.department ? ` · ${person.department}` : ''}
                                </span>
                              </span>
                              {person.hasPayslip ? (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Generated</span>
                              ) : !person.canGenerate ? (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Awaiting payroll</span>
                              ) : null}
                            </label>
                          );
                        })
                      : null}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-sky-100 bg-sky-50 px-3.5 py-3 text-sm text-sky-800">
                Payslips will be generated only for selected employees who do not already have a payslip for {drawerPeriodLabel}.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <AdminButton disabled={busy} onClick={() => setDrawerOpen(false)}>
                Cancel
              </AdminButton>
              <AdminButton variant="primary" disabled={busy || !drawerSelected.length} onClick={generateFromDrawer}>
                {busy ? 'Generating...' : `Generate Payslips (${drawerSelected.length})`}
              </AdminButton>
            </div>
          </aside>
        </div>
      ) : null}

      {headerOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/30 p-4 sm:items-center" onClick={() => setHeaderOpen(false)}>
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-900">Payslip header</h2>
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
              <AdminButton variant="primary" onClick={saveHeader}>
                Save header
              </AdminButton>
              <AdminButton onClick={() => setHeaderOpen(false)}>Close</AdminButton>
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
    </div>
  );
}
