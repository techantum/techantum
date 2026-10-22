'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Icon from '@/components/ui/AppIcon';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MARKS = ['P', 'UL', 'PL', 'HD', 'UHD'] as const;
type Mark = (typeof MARKS)[number];

const MARK_META: Record<string, { label: string; chip: string; soft: string }> = {
  P: { label: 'Present', chip: 'bg-emerald-100 text-emerald-700', soft: 'bg-emerald-500' },
  UL: { label: 'Absent', chip: 'bg-rose-100 text-rose-700', soft: 'bg-rose-500' },
  PL: { label: 'Paid Leave', chip: 'bg-amber-100 text-amber-800', soft: 'bg-amber-400' },
  HD: { label: 'Half Day', chip: 'bg-violet-100 text-violet-700', soft: 'bg-violet-500' },
  UHD: { label: 'Unpaid Half', chip: 'bg-orange-100 text-orange-700', soft: 'bg-orange-500' },
  H: { label: 'Holiday', chip: 'bg-slate-200 text-slate-600', soft: 'bg-slate-400' },
  WO: { label: 'Weekly Off', chip: 'bg-slate-100 text-slate-400', soft: 'bg-slate-300' },
};

const now = new Date();

type DateCol = { date: string; weekday: number; kind: 'working' | 'weekly_off' | 'holiday'; holidayName: string | null };
type EmployeeRow = {
  id: string;
  employee_code: string;
  full_name: string;
  department?: string | null;
  designation?: string | null;
  employment_status?: string | null;
  date_of_joining?: string | null;
  last_working_date?: string | null;
  cells: Record<string, string>;
};
type Activity = { employee: string; attendance_date: string; previous_status: string | null; next_status: string | null; changed_at: string };

function todayIso() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function employed(date: string, joining?: string | null, last?: string | null) {
  if (joining && date < joining.slice(0, 10)) return false;
  if (last && date > last.slice(0, 10)) return false;
  return true;
}

function initials(name: string) {
  const parts = name.split(' ').filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

function ago(value: string) {
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return '';
  const minutes = Math.max(1, Math.round((Date.now() - then) / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export default function AttendanceBoard() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [dates, setDates] = useState<DateCol[]>([]);
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({});
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [brush, setBrush] = useState<Mark>('P');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [detail, setDetail] = useState(false);
  const today = todayIso();

  const load = async (nextYear = year, nextMonth = month) => {
    const response = await fetch(`/api/admin/hr/attendance?year=${nextYear}&month=${nextMonth}`);
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || 'Could not load attendance');
      return;
    }
    setError('');
    setDates(body.dates || []);
    setRows(body.employees || []);
    setDraft({});
    const people: EmployeeRow[] = body.employees || [];
    const histories = await Promise.all(
      people.map(async (person) => {
        const history = await fetch(`/api/admin/hr/attendance/${person.id}/history?year=${nextYear}&month=${nextMonth}`);
        const items = await history.json();
        return (Array.isArray(items) ? items : []).map((item) => ({ ...item, employee: person.full_name }));
      })
    );
    setActivity(histories.flat().sort((a, b) => String(b.changed_at).localeCompare(String(a.changed_at))).slice(0, 8));
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const cell = (row: EmployeeRow, date: string) => (draft[row.id] && Object.prototype.hasOwnProperty.call(draft[row.id], date) ? draft[row.id][date] : row.cells[date] || '');

  const dirty = useMemo(() => {
    const updates: { employee_id: string; date: string; status: string | null }[] = [];
    for (const row of rows) {
      const edits = draft[row.id] || {};
      for (const [date, status] of Object.entries(edits)) {
        const previous = row.cells[date] || '';
        if (status !== previous) updates.push({ employee_id: row.id, date, status: status || null });
      }
    }
    return updates;
  }, [draft, rows]);

  const departments = useMemo(() => [...new Set(rows.map((row) => row.department).filter(Boolean))].sort() as string[], [rows]);

  const visible = rows.filter((row) => {
    const text = `${row.full_name} ${row.employee_code} ${row.department || ''} ${row.designation || ''}`.toLowerCase();
    if (query.trim() && !text.includes(query.trim().toLowerCase())) return false;
    if (department && row.department !== department) return false;
    if (!status) return true;
    const todayColumn = dates.find((date) => date.date === today);
    const sample = todayColumn ? [today] : dates.filter((date) => date.kind === 'working').map((date) => date.date);
    return sample.some((date) => {
      const value = cell(row, date);
      if (status === 'pending') return dates.find((item) => item.date === date)?.kind === 'working' && employed(date, row.date_of_joining, row.last_working_date) && !value;
      if (status === 'half') return value === 'HD' || value === 'UHD';
      return value === status;
    });
  });

  const tally = (row: EmployeeRow) => {
    const counts = { P: 0, UL: 0, PL: 0, HD: 0, UHD: 0, pending: 0 };
    for (const date of dates) {
      if (date.kind !== 'working' || !employed(date.date, row.date_of_joining, row.last_working_date)) continue;
      const value = cell(row, date.date);
      if (!value) counts.pending += 1;
      else if (value in counts) counts[value as Mark] += 1;
    }
    return counts;
  };

  const summary = visible.reduce(
    (bag, row) => {
      const counts = tally(row);
      bag.present += counts.P;
      bag.absent += counts.UL;
      bag.paid += counts.PL;
      bag.half += counts.HD;
      bag.unpaidHalf += counts.UHD;
      bag.pending += counts.pending;
      bag.slots += counts.P + counts.UL + counts.PL + counts.HD + counts.UHD + counts.pending;
      return bag;
    },
    { present: 0, absent: 0, paid: 0, half: 0, unpaidHalf: 0, pending: 0, slots: 0 }
  );
  const workingDays = dates.filter((date) => date.kind === 'working').length;
  const todayCounts = visible.reduce(
    (bag, row) => {
      const value = cell(row, today);
      if (value === 'P') bag.present += 1;
      else if (value === 'UL') bag.absent += 1;
      else if (value === 'PL') bag.leave += 1;
      else if (value === 'HD' || value === 'UHD') bag.half += 1;
      return bag;
    },
    { present: 0, absent: 0, leave: 0, half: 0 }
  );

  const shiftMonth = (delta: number) => {
    if (dirty.length && !window.confirm('Leave this month without saving attendance changes?')) return;
    const cursor = new Date(year, month - 1 + delta, 1);
    setYear(cursor.getFullYear());
    setMonth(cursor.getMonth() + 1);
  };

  const paint = (row: EmployeeRow, date: DateCol) => {
    if (date.kind !== 'working' || !employed(date.date, row.date_of_joining, row.last_working_date)) return;
    const current = cell(row, date.date);
    const next = current === brush ? '' : brush;
    setDraft((previous) => ({ ...previous, [row.id]: { ...(previous[row.id] || {}), [date.date]: next } }));
    setMessage('');
  };

  const save = async () => {
    if (!dirty.length) {
      setMessage('No attendance changes to save.');
      return;
    }
    setSaving(true);
    setError('');
    const response = await fetch('/api/admin/hr/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: dirty, overwrite: true, reason: 'Attendance correction' }),
    });
    const body = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(body.error || 'Could not save attendance');
      return;
    }
    setMessage(`Saved ${body.saved} attendance mark${body.saved === 1 ? '' : 's'}.`);
    await load();
  };

  const percent = (count: number) => (summary.slots ? `${((count / summary.slots) * 100).toFixed(1)}%` : '0%');
  const bars = [
    ['Present', summary.present, 'bg-emerald-500'],
    ['Absent', summary.absent, 'bg-rose-500'],
    ['Paid Leave', summary.paid, 'bg-amber-400'],
    ['Unpaid Half', summary.unpaidHalf, 'bg-orange-500'],
    ['Half Day', summary.half, 'bg-violet-500'],
    ['Pending', summary.pending, 'bg-slate-300'],
  ] as const;

  return (
    <div className="space-y-4">
      <AdminPageHeader kicker="Human Resources" title="Attendance" description="Manage and update employee attendance for the month." />
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 px-1">
          <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-50" onClick={() => shiftMonth(-1)} aria-label="Previous month"><Icon name="ChevronLeftIcon" size={16} /></button>
          <span className="min-w-32 text-center text-sm font-semibold text-slate-800">{MONTHS[month - 1]} {year}</span>
          <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-50" onClick={() => shiftMonth(1)} aria-label="Next month"><Icon name="ChevronRightIcon" size={16} /></button>
        </div>
        <label className="relative min-w-[240px] flex-1">
          <Icon name="MagnifyingGlassIcon" className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} />
          <input className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-secondary" placeholder="Search employee by name, ID or department..." value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <select className="h-10 rounded-xl border border-slate-200 px-3 text-sm" value={department} onChange={(event) => setDepartment(event.target.value)}>
          <option value="">All Departments</option>
          {departments.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select className="h-10 rounded-xl border border-slate-200 px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All Status</option>
          <option value="P">Present</option>
          <option value="UL">Absent</option>
          <option value="PL">Paid Leave</option>
          <option value="half">Half Day</option>
          <option value="pending">Pending</option>
        </select>
        <AdminButton variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : `Save All Changes${dirty.length ? ` (${dirty.length})` : ''}`}</AdminButton>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ['Total Employees', visible.length, 'UsersIcon', 'bg-sky-50 text-sky-600'],
          ['Present Today', todayCounts.present, 'CheckCircleIcon', 'bg-emerald-50 text-emerald-600'],
          ['Absent Today', todayCounts.absent, 'XCircleIcon', 'bg-rose-50 text-rose-600'],
          ['On Leave Today', todayCounts.leave, 'CalendarDaysIcon', 'bg-amber-50 text-amber-600'],
          ['Half Day Today', todayCounts.half, 'ClockIcon', 'bg-violet-50 text-violet-600'],
        ].map(([label, value, icon, tone]) => (
          <div key={String(label)} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon name={String(icon)} size={18} /></span>
            <span>
              <span className="block text-xs text-slate-400">{label}</span>
              <span className="block text-xl font-semibold text-slate-900">{value}</span>
            </span>
          </div>
        ))}
        <button type="button" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:border-secondary/40" onClick={() => document.getElementById('attendance-summary')?.scrollIntoView({ behavior: 'smooth' })}>
          View Reports <Icon name="ChevronRightIcon" size={16} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
        {MARKS.map((code) => (
          <button key={code} type="button" className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-semibold ${MARK_META[code].chip} ${brush === code ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`} onClick={() => setBrush(code)}>
            {code} {MARK_META[code].label}
          </button>
        ))}
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-semibold ${MARK_META.H.chip}`}>H Holiday</span>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-semibold ${MARK_META.WO.chip}`}>WO Weekly Off</span>
        <Link href="/admin/hr/holidays" className="ml-auto rounded-full border border-orange-200 px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-orange-50">Manage Holidays</Link>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-max border-separate border-spacing-0 text-xs">
            <thead>
              <tr className="text-slate-400">
                <th className="sticky left-0 z-20 bg-white px-3 py-2 text-left">#</th>
                <th className="sticky left-10 z-20 min-w-56 bg-white px-3 py-2 text-left">Employee</th>
                {dates.map((date) => (
                  <th key={date.date} className={`px-1 py-2 text-center font-medium ${date.date === today ? 'text-secondary' : ''}`}>
                    <span className="block">{date.date.slice(8)}</span>
                    <span className="block text-[10px]">{WEEKDAYS[date.weekday] || ''}</span>
                  </th>
                ))}
                {MARKS.map((code) => <th key={code} className="px-2 py-2 text-center">{code === 'UL' ? 'A' : code}</th>)}
              </tr>
            </thead>
            <tbody>
              {visible.map((row, index) => {
                const counts = tally(row);
                return (
                  <tr key={row.id}>
                    <td className="sticky left-0 z-10 border-t border-slate-100 bg-white px-3 py-2 text-slate-400">{index + 1}</td>
                    <td className="sticky left-10 z-10 border-t border-slate-100 bg-white px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-[11px] font-semibold text-secondary">{initials(row.full_name)}</span>
                        <span>
                          <span className="block font-semibold text-slate-900">{row.full_name}</span>
                          <span className="block text-[10px] text-slate-400">{row.employee_code}{row.designation ? ` · ${row.designation}` : ''}{row.employment_status === 'probation' ? ' · Probation, paid leave is unpaid' : row.employment_status === 'part_time' ? ' · Part time, no leave or benefits' : ''}</span>
                        </span>
                      </div>
                    </td>
                    {dates.map((date) => {
                      const off = date.kind !== 'working';
                      const active = employed(date.date, row.date_of_joining, row.last_working_date);
                      const value = off ? (date.kind === 'holiday' ? 'H' : 'WO') : cell(row, date.date);
                      const changed = !off && draft[row.id] && Object.prototype.hasOwnProperty.call(draft[row.id], date.date) && draft[row.id][date.date] !== (row.cells[date.date] || '');
                      return (
                        <td key={date.date} className="border-t border-slate-100 px-1 py-1 text-center">
                          <button
                            type="button"
                            disabled={off || !active}
                            title={off ? (date.holidayName || MARK_META[value].label) : active ? (MARK_META[value]?.label || 'Not marked') : 'Outside employment dates'}
                            className={`h-7 w-9 rounded-md text-[11px] font-semibold ${value ? MARK_META[value].chip : 'bg-white text-slate-300'} ${changed ? 'ring-2 ring-secondary' : ''} disabled:cursor-default`}
                            onClick={() => paint(row, date)}
                          >
                            {value || (active && !off ? '·' : '')}
                          </button>
                        </td>
                      );
                    })}
                    {MARKS.map((code) => <td key={code} className="border-t border-slate-100 px-2 text-center font-semibold text-slate-600">{counts[code]}</td>)}
                  </tr>
                );
              })}
              {!visible.length ? <tr><td colSpan={dates.length + 7} className="px-4 py-8 text-center text-sm text-slate-500">No employees match these filters.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-4 py-3">
          <Link href="/admin/hr/employees/new" className="text-sm font-semibold text-secondary">+ Add Employee</Link>
        </div>
      </section>

      <div id="attendance-summary" className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Attendance Summary</h2>
            <button type="button" className="text-xs font-semibold text-secondary" onClick={() => setDetail((current) => !current)}>{detail ? 'Hide Detailed Report' : 'View Detailed Report'}</button>
          </div>
          <div className="mb-3 flex items-center justify-between text-sm"><span className="text-slate-500">Total Working Days</span><span className="font-semibold">{workingDays}</span></div>
          <div className="space-y-2">
            {bars.map(([label, count, color]) => (
              <div key={label} className="grid grid-cols-[120px_1fr_90px] items-center gap-2 text-sm">
                <span className="text-slate-600">{label}</span>
                <span className="h-2 overflow-hidden rounded-full bg-slate-100"><span className={`block h-full ${color}`} style={{ width: percent(count) }} /></span>
                <span className="text-right text-slate-500">{count} ({percent(count)})</span>
              </div>
            ))}
          </div>
          {detail ? (
            <table className="mt-4 w-full text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wider text-slate-400"><th className="py-2">Employee</th><th>P</th><th>A</th><th>PL</th><th>HD</th><th>UHD</th><th>Pending</th></tr></thead>
              <tbody>
                {visible.map((row) => {
                  const counts = tally(row);
                  return <tr key={row.id} className="border-t border-slate-100"><td className="py-2">{row.full_name}</td><td>{counts.P}</td><td>{counts.UL}</td><td>{counts.PL}</td><td>{counts.HD}</td><td>{counts.UHD}</td><td>{counts.pending}</td></tr>;
                })}
              </tbody>
            </table>
          ) : null}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Recent Activities</h2>
          <div className="space-y-3">
            {activity.length ? activity.map((item, index) => (
              <div key={`${item.changed_at}-${index}`} className="flex gap-2 text-sm">
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${MARK_META[item.next_status || '']?.chip || 'bg-slate-100 text-slate-500'}`}>{item.next_status || '·'}</span>
                <span>
                  <span className="block text-slate-700">{item.employee} marked {MARK_META[item.next_status || '']?.label || 'cleared'} on {String(item.attendance_date).slice(0, 10)}</span>
                  <span className="block text-xs text-slate-400">{ago(item.changed_at)}</span>
                </span>
              </div>
            )) : <p className="text-sm text-slate-500">No attendance changes for this month yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
