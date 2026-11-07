'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminButton from '@/components/admin/AdminButton';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Icon from '@/components/ui/AppIcon';
import { HrSalary } from '@/components/admin/hr/HrSalary';
import { PeriodPicker } from './PeriodPicker';

const now = new Date();
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

type PayrollRow = Record<string, string> & { id: string; full_name: string; employee_code?: string; payroll_month: string; status: string };
type LeaveRow = Record<string, string> & { id: string; full_name: string; payroll_month: string };
type MonthRow = { month: number; workingDays: number; weeklyOff: number; holidays: number };

function days(value: unknown) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return '0';
  return Number.isInteger(amount) ? String(amount) : String(Math.round(amount * 100) / 100);
}

function monthLabel(value: unknown) {
  const month = Number(value);
  return MONTHS[month - 1] || String(value || '—');
}

function initials(name: string) {
  const parts = String(name || '')
    .split(/\s+/)
    .filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '—';
}

function statusMeta(status: string) {
  const key = String(status || '').toLowerCase();
  if (key === 'paid') return { label: 'Paid', tone: 'bg-emerald-50 text-emerald-700', icon: 'CheckCircleIcon' };
  if (key === 'approved') return { label: 'Approved', tone: 'bg-emerald-50 text-emerald-700', icon: 'CheckCircleIcon' };
  if (key === 'ready_for_approval') return { label: 'Ready', tone: 'bg-sky-50 text-sky-700', icon: 'ClockIcon' };
  if (key === 'attendance_pending' || key === 'draft') return { label: 'Pending', tone: 'bg-amber-50 text-amber-700', icon: 'ClockIcon' };
  return { label: status || '—', tone: 'bg-slate-100 text-slate-600', icon: 'ClockIcon' };
}

export default function AnnualSummary() {
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<{ companyMonths: MonthRow[]; payroll: PayrollRow[]; leave: LeaveRow[] } | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [query, setQuery] = useState('');
  const [payrollPage, setPayrollPage] = useState(1);
  const [leavePage, setLeavePage] = useState(1);

  useEffect(() => {
    fetch(`/api/admin/hr/annual?year=${year}`)
      .then((response) => response.json())
      .then((body) => {
        setData({
          companyMonths: body.companyMonths || [],
          payroll: body.payroll || [],
          leave: body.leave || [],
        });
        setPayrollPage(1);
        setLeavePage(1);
      });
  }, [year]);

  const employees = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of data?.payroll || []) {
      map.set(row.full_name, row.full_name);
    }
    return [...map.values()].sort((a, b) => a.localeCompare(b));
  }, [data]);

  const filteredPayroll = useMemo(() => {
    const text = query.trim().toLowerCase();
    return (data?.payroll || []).filter((row) => {
      if (employeeFilter && row.full_name !== employeeFilter) return false;
      if (monthFilter && String(row.payroll_month) !== monthFilter) return false;
      if (!text) return true;
      return `${row.full_name} ${row.employee_code || ''}`.toLowerCase().includes(text);
    });
  }, [data, employeeFilter, monthFilter, query]);

  const leaveByEmployee = useMemo(() => {
    const bag = new Map<string, { name: string; opening: number; credit: number; used: number; closing: number; months: number }>();
    for (const row of data?.leave || []) {
      const current = bag.get(row.full_name) || { name: row.full_name, opening: 0, credit: 0, used: 0, closing: 0, months: 0 };
      const month = Number(row.payroll_month);
      if (!current.months || month < current.months) {
        current.opening = Number(row.opening_balance || 0);
        current.months = month || current.months;
      }
      current.credit += Number(row.monthly_credit || 0);
      current.used += Number(row.allowed_paid || 0);
      current.closing = Number(row.closing_balance || 0);
      bag.set(row.full_name, current);
    }
    return [...bag.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  const monthTotals = useMemo(() => {
    const months = data?.companyMonths || [];
    return {
      working: months.reduce((sum, row) => sum + Number(row.workingDays || 0), 0),
      weeklyOff: months.reduce((sum, row) => sum + Number(row.weeklyOff || 0), 0),
      holidays: months.reduce((sum, row) => sum + Number(row.holidays || 0), 0),
    };
  }, [data]);

  const kpis = useMemo(() => {
    const payroll = data?.payroll || [];
    const uniqueEmployees = new Set(payroll.map((row) => row.full_name)).size;
    const gross = payroll.reduce((sum, row) => sum + Number(row.monthly_gross || 0), 0);
    const net = payroll.reduce((sum, row) => sum + Number(row.net_payable || 0), 0);
    const lop = payroll.reduce((sum, row) => sum + Number(row.lop_deduction || 0), 0);
    const pending = payroll.filter((row) => !['approved', 'paid'].includes(String(row.status || '').toLowerCase())).length;
    const paidLeave = payroll.reduce((sum, row) => sum + Number(row.paid_leave_days || 0), 0);
    const avgLeave = uniqueEmployees ? paidLeave / uniqueEmployees : 0;
    return { uniqueEmployees, gross, net, lop, pending, avgLeave };
  }, [data]);

  const leaveTotals = useMemo(
    () => ({
      employees: leaveByEmployee.length,
      opening: leaveByEmployee.reduce((sum, row) => sum + row.opening, 0),
      credit: leaveByEmployee.reduce((sum, row) => sum + row.credit, 0),
      used: leaveByEmployee.reduce((sum, row) => sum + row.used, 0),
      closing: leaveByEmployee.reduce((sum, row) => sum + row.closing, 0),
    }),
    [leaveByEmployee]
  );

  const payrollPageSize = 5;
  const leavePageSize = 6;
  const payrollPages = Math.max(1, Math.ceil(filteredPayroll.length / payrollPageSize));
  const leavePages = Math.max(1, Math.ceil(leaveByEmployee.length / leavePageSize));
  const payrollSlice = filteredPayroll.slice((payrollPage - 1) * payrollPageSize, payrollPage * payrollPageSize);
  const leaveSlice = leaveByEmployee.slice((leavePage - 1) * leavePageSize, leavePage * leavePageSize);
  const leftMonths = (data?.companyMonths || []).slice(0, 6);
  const rightMonths = (data?.companyMonths || []).slice(6);

  const resetFilters = () => {
    setEmployeeFilter('');
    setMonthFilter('');
    setQuery('');
    setPayrollPage(1);
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader
        kicker="Human Resources"
        title="Annual Payroll Summary"
        description="Company working days, employee payroll, and leave balances for the selected year."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <PeriodPicker year={year} yearOnly onChange={(next) => setYear(next.year)} />
            <a className="inline-flex h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-secondary/40" href={`/api/admin/hr/annual/export?year=${year}`}>
              Export Excel
            </a>
            <a className="inline-flex h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-secondary/40" href={`/api/admin/hr/annual/pdf?year=${year}`}>
              Export PDF
            </a>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ['Total Employees', String(kpis.uniqueEmployees), 'UsersIcon', 'bg-sky-50 text-sky-600'],
          ['Total Gross Payroll', <HrSalary key="gross" value={kpis.gross} />, 'BanknotesIcon', 'bg-violet-50 text-violet-600'],
          ['Total Net Payroll', <HrSalary key="net" value={kpis.net} />, 'CreditCardIcon', 'bg-emerald-50 text-emerald-600'],
          ['Total LOP Deduction', <HrSalary key="lop" value={kpis.lop} />, 'MinusCircleIcon', 'bg-rose-50 text-rose-600'],
          ['Pending Approvals', String(kpis.pending), 'ClockIcon', 'bg-amber-50 text-amber-600'],
          ['Avg Paid Leaves', days(kpis.avgLeave), 'CalendarDaysIcon', 'bg-orange-50 text-orange-600'],
        ].map(([label, value, icon, tone]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs text-slate-500">{label}</span>
              <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${tone}`}>
                <Icon name={String(icon)} size={16} />
              </span>
            </div>
            <div className="mt-2 text-xl font-semibold text-slate-900">{value}</div>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Monthly Calendar Summary</h2>
          <div className="flex flex-wrap gap-4 text-sm text-slate-600">
            <span>
              Total Working Days <strong className="text-slate-900">{monthTotals.working}</strong>
            </span>
            <span>
              Total Weekly Offs <strong className="text-slate-900">{monthTotals.weeklyOff}</strong>
            </span>
            <span>
              Total Holidays <strong className="text-slate-900">{monthTotals.holidays}</strong>
            </span>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[leftMonths, rightMonths].map((rows, index) => (
            <table key={index} className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="pb-2">Month</th>
                  <th className="pb-2">Working Days</th>
                  <th className="pb-2">Weekly Offs</th>
                  <th className="pb-2">Holidays</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((month) => (
                  <tr key={month.month} className="border-t border-slate-100">
                    <td className="py-2 font-medium text-slate-800">{monthLabel(month.month)}</td>
                    <td className="py-2">{month.workingDays}</td>
                    <td className="py-2">{month.weeklyOff}</td>
                    <td className="py-2">{month.holidays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Employee Payroll Summary</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_1.4fr_auto] md:items-center">
            <select className="h-10 rounded-xl border border-slate-200 px-3 text-sm" value={employeeFilter} onChange={(event) => { setEmployeeFilter(event.target.value); setPayrollPage(1); }}>
              <option value="">All Employees</option>
              {employees.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <select className="h-10 rounded-xl border border-slate-200 px-3 text-sm" value={monthFilter} onChange={(event) => { setMonthFilter(event.target.value); setPayrollPage(1); }}>
              <option value="">All Months</option>
              {MONTHS.map((name, index) => (
                <option key={name} value={String(index + 1)}>
                  {name}
                </option>
              ))}
            </select>
            <label className="relative">
              <Icon name="MagnifyingGlassIcon" className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} />
              <input
                className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-secondary"
                placeholder="Search by employee name or ID..."
                value={query}
                onChange={(event) => { setQuery(event.target.value); setPayrollPage(1); }}
              />
            </label>
            <AdminButton onClick={resetFilters}>Reset Filters</AdminButton>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3">Gross (₹)</th>
                <th className="px-4 py-3">Net (₹)</th>
                <th className="px-4 py-3">Paid Leave</th>
                <th className="px-4 py-3">Unpaid Leave / LOP</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {payrollSlice.map((row) => {
                const status = statusMeta(row.status);
                return (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 text-xs font-semibold text-secondary">{initials(row.full_name)}</span>
                        <span>
                          <span className="block font-semibold text-slate-900">{row.full_name}</span>
                          {row.employee_code ? <span className="block text-xs text-slate-400">{row.employee_code}</span> : null}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{monthLabel(row.payroll_month)}</td>
                    <td className="px-4 py-3"><HrSalary value={row.monthly_gross} /></td>
                    <td className="px-4 py-3"><HrSalary value={row.net_payable} /></td>
                    <td className="px-4 py-3">{days(row.paid_leave_days)}</td>
                    <td className="px-4 py-3">{days(row.unpaid_leave)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${status.tone}`}>
                        <Icon name={status.icon} size={14} />
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!payrollSlice.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                    No payroll records match these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <p>
            Showing {filteredPayroll.length ? (payrollPage - 1) * payrollPageSize + 1 : 0}–
            {Math.min(payrollPage * payrollPageSize, filteredPayroll.length)} of {filteredPayroll.length} records
          </p>
          <div className="flex gap-1">
            {Array.from({ length: payrollPages }, (_, index) => index + 1)
              .slice(0, 5)
              .map((number) => (
                <button
                  key={number}
                  type="button"
                  className={`h-8 w-8 rounded-lg text-sm ${number === payrollPage ? 'bg-orange-50 font-semibold text-secondary' : ''}`}
                  onClick={() => setPayrollPage(number)}
                >
                  {number}
                </button>
              ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Leave Balance Summary</h2>
          <div className="flex flex-wrap gap-4 text-sm text-slate-600">
            <span>
              Employees <strong className="text-slate-900">{leaveTotals.employees}</strong>
            </span>
            <span>
              Total Opening <strong className="text-slate-900">{days(leaveTotals.opening)}</strong>
            </span>
            <span>
              Total Credited <strong className="text-slate-900">{days(leaveTotals.credit)}</strong>
            </span>
            <span>
              Total Used <strong className="text-slate-900">{days(leaveTotals.used)}</strong>
            </span>
            <span>
              Total Closing <strong className="text-slate-900">{days(leaveTotals.closing)}</strong>
            </span>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {leaveSlice.map((row) => (
            <article key={row.name} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-semibold text-secondary shadow-sm">{initials(row.name)}</span>
                <h3 className="text-sm font-semibold text-slate-900">{row.name}</h3>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ['Opening', row.opening],
                    ['Credited', row.credit],
                    ['Used', row.used],
                    ['Closing', row.closing],
                  ].map(([label, value]) => (
                    <tr key={String(label)} className="border-t border-slate-200/80">
                      <td className="py-1.5 text-slate-500">{label}</td>
                      <td className="py-1.5 text-right font-semibold text-slate-800">{days(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          ))}
          {!leaveSlice.length ? <p className="col-span-full py-8 text-center text-sm text-slate-500">No leave ledger rows for this year.</p> : null}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
          <p>
            Showing {leaveByEmployee.length ? (leavePage - 1) * leavePageSize + 1 : 0}–
            {Math.min(leavePage * leavePageSize, leaveByEmployee.length)} of {leaveByEmployee.length} employees
          </p>
          <div className="flex gap-1">
            {Array.from({ length: leavePages }, (_, index) => index + 1)
              .slice(0, 5)
              .map((number) => (
                <button
                  key={number}
                  type="button"
                  className={`h-8 w-8 rounded-lg text-sm ${number === leavePage ? 'bg-orange-50 font-semibold text-secondary' : ''}`}
                  onClick={() => setLeavePage(number)}
                >
                  {number}
                </button>
              ))}
          </div>
        </div>
      </section>
    </div>
  );
}
