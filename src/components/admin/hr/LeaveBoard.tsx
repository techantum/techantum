'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Icon from '@/components/ui/AppIcon';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const now = new Date();

type LeaveRow = {
  id: string;
  full_name: string;
  employee_code: string;
  department?: string | null;
  opening: number;
  credit: number;
  adjustment: number;
  available: number;
  allowedPaid: number;
  unpaid: number;
  closing: number;
  pendingDays?: number;
  calculation_error?: string | null;
  employment_status?: string | null;
  month?: number;
};

type Adjustment = {
  id: string;
  employee_id: string;
  full_name: string;
  payroll_year: number;
  payroll_month: number;
  amount: string;
  reason: string;
  created_at: string;
};

type FeedItem = {
  key: string;
  date: string;
  employee: string;
  type: string;
  days: number;
  reason: string;
};

function days(value: unknown) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return '0';
  return Number.isInteger(amount) ? String(amount) : String(Math.round(amount * 100) / 100);
}

function signed(value: number) {
  if (!value) return '0';
  return `${value > 0 ? '+' : ''}${days(value)}`;
}

export default function LeaveBoard() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [department, setDepartment] = useState('');
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [policy, setPolicy] = useState({ monthlyLeaveCredit: 1, maxPaidLeavePerMonth: 5, carryForward: true });
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [feedPage, setFeedPage] = useState(1);
  const [menu, setMenu] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [history, setHistory] = useState<LeaveRow[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [adjustment, setAdjustment] = useState({ employee_id: '', type: 'credit', amount: '', reason: '' });
  const [opening, setOpening] = useState<{ employee_id: string; balance: string; note: string } | null>(null);

  const load = async (nextYear = year, nextMonth = month, nextQuery = appliedQuery) => {
    const params = new URLSearchParams({ year: String(nextYear), month: String(nextMonth), q: nextQuery });
    const [leaveResponse, settingsResponse, adjustmentResponse] = await Promise.all([
      fetch(`/api/admin/hr/leave?${params}`),
      fetch('/api/admin/hr/settings'),
      fetch(`/api/admin/hr/leave/adjustments?year=${nextYear}`),
    ]);
    const leave = await leaveResponse.json();
    const settings = await settingsResponse.json();
    const saved = await adjustmentResponse.json();
    if (!leaveResponse.ok) {
      setError(leave.error || 'Could not load leave');
      return;
    }
    setError('');
    setRows(leave.rows || []);
    if (settingsResponse.ok) {
      setPolicy({
        monthlyLeaveCredit: Number(settings.monthlyLeaveCredit ?? 1),
        maxPaidLeavePerMonth: Number(settings.maxPaidLeavePerMonth ?? 5),
        carryForward: Boolean(settings.carryForward),
      });
    }
    setAdjustments(Array.isArray(saved) ? saved : []);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, appliedQuery]);

  const departments = useMemo(() => [...new Set(rows.map((row) => row.department).filter(Boolean))].sort() as string[], [rows]);
  const visible = rows.filter((row) => !department || row.department === department);
  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * pageSize;
  const pageRows = visible.slice(start, start + pageSize);
  const sum = (key: keyof LeaveRow) => visible.reduce((total, row) => total + Number(row[key] || 0), 0);
  const selected = visible.find((row) => row.id === selectedId) || rows.find((row) => row.id === selectedId);

  const feed = useMemo(() => {
    const items: FeedItem[] = [];
    for (const row of rows) {
      if (Number(row.credit) > 0) {
        items.push({
          key: `credit-${row.id}`,
          date: `${year}-${String(month).padStart(2, '0')}-01`,
          employee: row.full_name,
          type: 'Monthly Credit',
          days: Number(row.credit),
          reason: 'Monthly leave credit',
        });
      }
      if (policy.carryForward && Number(row.opening) > 0) {
        items.push({
          key: `carry-${row.id}`,
          date: `${year}-${String(month).padStart(2, '0')}-01`,
          employee: row.full_name,
          type: 'Carry Forward',
          days: Number(row.opening),
          reason: 'Unused leave carried forward',
        });
      }
    }
    for (const item of adjustments) {
      if (Number(item.payroll_month) !== month) continue;
      items.push({
        key: item.id,
        date: String(item.created_at).slice(0, 10),
        employee: item.full_name,
        type: 'Manual Adjustment',
        days: Number(item.amount),
        reason: item.reason,
      });
    }
    return items.sort((a, b) => b.date.localeCompare(a.date) || a.employee.localeCompare(b.employee));
  }, [adjustments, month, policy.carryForward, rows, year]);

  const feedSize = 6;
  const feedPages = Math.max(1, Math.ceil(feed.length / feedSize));
  const feedStart = (Math.min(feedPage, feedPages) - 1) * feedSize;

  const saveAdjustment = async () => {
    setError('');
    setMessage('');
    const magnitude = Number(adjustment.amount);
    if (!adjustment.employee_id) {
      setError('Select an employee');
      return;
    }
    const person = rows.find((row) => row.id === adjustment.employee_id);
    if (person && person.employment_status && person.employment_status !== 'regular') {
      setError('Paid leave applies only to regular employees.');
      return;
    }
    if (!Number.isFinite(magnitude) || magnitude <= 0) {
      setError('Enter the number of days');
      return;
    }
    if (!adjustment.reason.trim()) {
      setError('A reason is required for a leave adjustment');
      return;
    }
    const response = await fetch('/api/admin/hr/leave/adjustments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: adjustment.employee_id,
        year,
        month,
        amount: adjustment.type === 'debit' ? -magnitude : magnitude,
        reason: adjustment.reason.trim(),
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || 'Could not save the adjustment');
      return;
    }
    setMessage('Leave adjustment saved');
    setAdjustment({ employee_id: '', type: 'credit', amount: '', reason: '' });
    await load();
  };

  const saveOpening = async () => {
    if (!opening) return;
    setError('');
    setMessage('');
    const response = await fetch('/api/admin/hr/leave/opening', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: opening.employee_id, year, month, balance: opening.balance, note: opening.note }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || 'Could not save the opening balance');
      return;
    }
    setMessage('Opening balance saved');
    setOpening(null);
    await load();
  };

  const openHistory = async (employeeId: string) => {
    setSelectedId(employeeId);
    setHistoryOpen(true);
    const response = await fetch(`/api/admin/hr/leave/history?employeeId=${employeeId}&year=${year}`);
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || 'Could not load leave history');
      return;
    }
    setHistory(Array.isArray(body) ? body : []);
    document.getElementById('leave-ledger')?.scrollIntoView({ behavior: 'smooth' });
  };

  const focusAdjustment = (employeeId: string) => {
    setMenu('');
    setAdjustment((current) => ({ ...current, employee_id: employeeId }));
    document.getElementById('leave-adjustment')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader
        kicker="Human Resources"
        title="Leave Management"
        description="View and manage paid leave for regular employees. Probation and part-time employees do not receive paid leave or leave benefits. Each eligible employee gets paid leave credited every month, and unused leave carries forward up to the monthly cap."
      />
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}

      <div className="flex flex-wrap items-center gap-2">
        <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm" value={month} onChange={(event) => { setMonth(Number(event.target.value)); setPage(1); }}>
          {MONTHS.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
        </select>
        <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm" value={year} onChange={(event) => setYear(Number(event.target.value))}>
          {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((value) => <option key={value}>{value}</option>)}
        </select>
        <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm" value={department} onChange={(event) => { setDepartment(event.target.value); setPage(1); }}>
          <option value="">All Departments</option>
          {departments.map((item) => <option key={item}>{item}</option>)}
        </select>
        <label className="relative min-w-[220px] flex-1">
          <Icon name="MagnifyingGlassIcon" className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} />
          <input className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-secondary" placeholder="Search employee by name or ID" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') setAppliedQuery(query.trim()); }} />
        </label>
        <AdminButton variant="primary" onClick={() => setAppliedQuery(query.trim())}>Search</AdminButton>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ['Total Employees', visible.length, 'Active employees', 'bg-sky-50 text-sky-600', 'UsersIcon'],
          ['Total Available Paid Leave', days(sum('available')), 'Across all employees', 'bg-emerald-50 text-emerald-600', 'BanknotesIcon'],
          ['This Month Credit', days(sum('credit')), `${days(policy.monthlyLeaveCredit)} leave per eligible employee`, 'bg-amber-50 text-amber-700', 'CalendarDaysIcon'],
          ['Paid Leave Used This Month', days(sum('allowedPaid')), 'Across all employees', 'bg-rose-50 text-rose-600', 'DocumentTextIcon'],
          ['Carry Forward Balance', days(sum('opening')), 'From previous months', 'bg-violet-50 text-violet-600', 'ArrowPathIcon'],
          ['Adjustments This Month', days(sum('adjustment')), 'Manual credits or debits', 'bg-cyan-50 text-cyan-700', 'PencilSquareIcon'],
        ].map(([label, value, hint, tone, icon]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs text-slate-500">{label}</span>
              <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${tone}`}><Icon name={String(icon)} size={16} /></span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
            <p className="text-xs text-slate-400">{hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-sm md:grid-cols-4">
        {[
          ['Paid Leave Policy', `Monthly Credit: ${days(policy.monthlyLeaveCredit)} leave`, 'Each eligible employee gets paid leave every month.', 'InformationCircleIcon'],
          ['Carry Forward', policy.carryForward ? 'Enabled' : 'Disabled', policy.carryForward ? 'Unused leave carries forward to next month.' : 'Unused leave does not carry forward.', 'ArrowPathIcon'],
          ['Monthly Usage Cap', `${days(policy.maxPaidLeavePerMonth)} leaves`, 'Maximum paid leaves that can be used in a month.', 'ShieldCheckIcon'],
          ['Balance Source', 'Regular employees', 'Probation and part-time employees do not receive paid leave or leave benefits.', 'ChartBarIcon'],
        ].map(([title, value, detail, icon]) => (
          <div key={String(title)} className="flex gap-2 rounded-xl bg-slate-50 px-3 py-2">
            <Icon name={String(icon)} className="mt-0.5 text-sky-600" size={16} />
            <span>
              <span className="block text-xs text-slate-400">{title}</span>
              <span className="block font-semibold text-slate-800">{value}</span>
              <span className="block text-xs text-slate-500">{detail}</span>
            </span>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Icon name="UsersIcon" size={16} /> Employee Leave Balances</h2>
          <span className="text-xs text-slate-400">Showing {visible.length ? start + 1 : 0}–{Math.min(start + pageSize, visible.length)} of {visible.length} employees</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                {['Employee', 'Employee ID', 'Opening Balance', 'Monthly Credit', 'Adjustment', 'Available Paid Leave', 'Paid Leave Used', 'Un-paid Leave', 'Closing Balance', 'Status', 'Actions'].map((heading) => (
                  <th key={heading} className="px-3 py-3 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const outside = row.employment_status === 'probation' || row.employment_status === 'part_time';
                const label = row.employment_status === 'probation' ? 'Probation' : row.employment_status === 'part_time' ? 'Part Time' : row.calculation_error ? 'Review' : Number(row.pendingDays) ? 'Pending' : 'Healthy';
                const tone = outside ? 'bg-amber-50 text-amber-700' : label === 'Healthy' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700';
                return (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-3 py-3 font-medium text-slate-900">{row.full_name}</td>
                    <td className="px-3 py-3 text-slate-500">{row.employee_code}</td>
                    <td className="px-3 py-3">{days(row.opening)}</td>
                    <td className="px-3 py-3 text-emerald-600">{days(row.credit)}</td>
                    <td className={`px-3 py-3 ${Number(row.adjustment) < 0 ? 'text-rose-600' : 'text-slate-700'}`}>{days(row.adjustment)}</td>
                    <td className="px-3 py-3 font-semibold text-emerald-600">{days(row.available)}</td>
                    <td className={`px-3 py-3 ${Number(row.allowedPaid) ? 'text-orange-600' : 'text-slate-400'}`}>{days(row.allowedPaid)}</td>
                    <td className={`px-3 py-3 ${Number(row.unpaid) ? 'text-rose-600' : 'text-slate-400'}`}>{days(row.unpaid)}</td>
                    <td className="px-3 py-3 font-semibold text-emerald-600">{days(row.closing)}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${tone}`}>{label}</span>
                    </td>
                    <td className="relative px-3 py-3">
                      <div className="flex items-center gap-3 text-xs font-semibold">
                        <button type="button" className="text-sky-600" onClick={() => openHistory(row.id)}>View Ledger</button>
                        <button type="button" className="text-secondary disabled:text-slate-300" disabled={outside} onClick={() => focusAdjustment(row.id)}>Adjust</button>
                        <button type="button" className="text-slate-400" aria-label="More actions" onClick={() => setMenu(menu === row.id ? '' : row.id)}><Icon name="EllipsisVerticalIcon" size={16} /></button>
                      </div>
                      {menu === row.id ? (
                        <div className="absolute right-3 z-10 mt-1 w-48 rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg">
                          <button type="button" className="block w-full px-3 py-2 text-left hover:bg-slate-50 disabled:text-slate-300" disabled={outside} onClick={() => { setMenu(''); setOpening({ employee_id: row.id, balance: days(row.opening), note: '' }); }}>Set opening balance</button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
              {!pageRows.length ? <tr><td colSpan={11} className="px-4 py-8 text-center text-slate-500">No employees match this month.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-1 border-t border-slate-100 px-4 py-2">
          {Array.from({ length: pages }, (_, index) => index + 1).map((number) => (
            <button key={number} type="button" className={`h-8 w-8 rounded-lg text-sm ${number === currentPage ? 'bg-orange-50 font-semibold text-secondary' : 'text-slate-500'}`} onClick={() => setPage(number)}>{number}</button>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <section id="leave-adjustment" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Icon name="PencilSquareIcon" size={16} className="text-secondary" /> Add Leave Adjustment</h2>
          <p className="mb-3 text-xs text-slate-400">Manually add or deduct paid leave for an employee.</p>
          <div className="space-y-3">
            <label className="block text-sm text-slate-700">Employee
              <select className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm" value={adjustment.employee_id} onChange={(event) => setAdjustment({ ...adjustment, employee_id: event.target.value })}>
                <option value="">Select employee</option>
                {rows.filter((row) => !row.employment_status || row.employment_status === 'regular').map((row) => <option key={row.id} value={row.id}>{row.full_name}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-sm text-slate-700">Adjustment Type
                <select className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm" value={adjustment.type} onChange={(event) => setAdjustment({ ...adjustment, type: event.target.value })}>
                  <option value="credit">Credit</option>
                  <option value="debit">Debit</option>
                </select>
              </label>
              <label className="block text-sm text-slate-700">Effective Month
                <input className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" readOnly value={`${MONTHS[month - 1]} ${year}`} />
              </label>
            </div>
            <label className="block text-sm text-slate-700">Days
              <input className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm" inputMode="decimal" placeholder="Enter days" value={adjustment.amount} onChange={(event) => setAdjustment({ ...adjustment, amount: event.target.value })} />
            </label>
            <label className="block text-sm text-slate-700">Reason / Note
              <textarea className="mt-1 h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Enter reason for adjustment" value={adjustment.reason} onChange={(event) => setAdjustment({ ...adjustment, reason: event.target.value })} />
            </label>
            <AdminButton variant="primary" onClick={saveAdjustment}>Save Adjustment</AdminButton>
          </div>
        </section>

        <section id="leave-ledger" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Employee Summary & Ledger</h2>
          <p className="mb-3 text-xs text-slate-400">View a quick summary or open full leave history for an employee.</p>
          <label className="block text-sm text-slate-700">Select Employee
            <select className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm" value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setHistoryOpen(false); }}>
              <option value="">Select employee</option>
              {rows.map((row) => <option key={row.id} value={row.id}>{row.full_name}</option>)}
            </select>
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {[
              ['Opening Balance', selected ? days(selected.opening) : '—'],
              ['Monthly Credit', selected ? days(selected.credit) : '—'],
              ['Adjustments', selected ? days(selected.adjustment) : '—'],
              ['Paid Leave Used', selected ? days(selected.allowedPaid) : '—'],
              ['Closing Balance', selected ? days(selected.closing) : '—'],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl bg-slate-50 px-3 py-2">
                <span className="block text-xs text-slate-400">{label}</span>
                <span className="font-semibold text-slate-800">{value}</span>
              </div>
            ))}
          </div>
          {selected && selected.employment_status && selected.employment_status !== 'regular' ? <p className="mt-3 text-xs text-amber-700">This employee is {selected.employment_status === 'probation' ? 'on probation' : 'part time'}, so paid leave and leave benefits are not applied.</p> : selected ? null : <p className="mt-3 text-xs text-sky-600">Select an employee to view their leave summary and detailed history.</p>}
          <button type="button" className="mt-3 text-sm font-semibold text-secondary disabled:text-slate-300" disabled={!selectedId} onClick={() => selectedId && openHistory(selectedId)}>View Leave History</button>
          {historyOpen && history.length ? (
            <table className="mt-3 w-full text-xs">
              <thead><tr className="text-left text-slate-400"><th className="py-1">Month</th><th>Opening</th><th>Credit</th><th>Used</th><th>Closing</th></tr></thead>
              <tbody>
                {history.map((item) => (
                  <tr key={String(item.month)} className="border-t border-slate-100">
                    <td className="py-1">{MONTHS[Number(item.month) - 1]}</td>
                    <td>{days(item.opening)}</td>
                    <td>{days(item.credit)}</td>
                    <td>{days(item.allowedPaid)}</td>
                    <td>{days(item.closing)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Recent Leave Adjustments</h2>
          <p className="mb-3 text-xs text-slate-400">Latest manual adjustments, monthly credits and carried balances.</p>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400"><th className="py-2">Date</th><th>Employee</th><th>Type</th><th>Days</th><th>Reason</th></tr></thead>
            <tbody>
              {feed.slice(feedStart, feedStart + feedSize).map((item) => (
                <tr key={item.key} className="border-t border-slate-100">
                  <td className="py-2 text-slate-500">{MONTHS[Number(item.date.slice(5, 7)) - 1]?.slice(0, 3)} {Number(item.date.slice(8))}, {item.date.slice(0, 4)}</td>
                  <td>{item.employee}</td>
                  <td><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.type === 'Manual Adjustment' ? 'bg-orange-50 text-orange-700' : item.type === 'Carry Forward' ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700'}`}>{item.type}</span></td>
                  <td className={item.days < 0 ? 'text-rose-600' : 'text-emerald-600'}>{signed(item.days)}</td>
                  <td className="text-slate-500">{item.reason}</td>
                </tr>
              ))}
              {!feed.length ? <tr><td colSpan={5} className="py-6 text-center text-slate-500">No leave activity for this month.</td></tr> : null}
            </tbody>
          </table>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>Showing {feed.length ? feedStart + 1 : 0}–{Math.min(feedStart + feedSize, feed.length)} of {feed.length} records</span>
            <span className="flex gap-1">
              {Array.from({ length: feedPages }, (_, index) => index + 1).slice(0, 5).map((number) => (
                <button key={number} type="button" className={`h-7 w-7 rounded-lg ${number === Math.min(feedPage, feedPages) ? 'bg-orange-50 font-semibold text-secondary' : ''}`} onClick={() => setFeedPage(number)}>{number}</button>
              ))}
            </span>
          </div>
        </section>
      </div>

      {opening ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 p-4">
          <form className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onSubmit={(event) => { event.preventDefault(); void saveOpening(); }}>
            <h2 className="text-sm font-semibold text-slate-900">Set opening balance</h2>
            <p className="mt-1 text-xs text-slate-500">Use this before a leave ledger exists. After that, post an adjustment instead.</p>
            <label className="mt-3 block text-sm">Balance
              <input className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3" value={opening.balance} onChange={(event) => setOpening({ ...opening, balance: event.target.value })} />
            </label>
            <label className="mt-3 block text-sm">Note
              <input className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3" value={opening.note} onChange={(event) => setOpening({ ...opening, note: event.target.value })} />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <AdminButton onClick={() => setOpening(null)}>Cancel</AdminButton>
              <AdminButton variant="primary" type="submit">Save opening</AdminButton>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
