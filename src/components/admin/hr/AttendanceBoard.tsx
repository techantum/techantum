'use client';

import { useEffect, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import { adminInputClass, adminSelectClass } from '@/components/admin/AdminField';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { FinanceShell, FinanceTd, FinanceTh } from '@/components/admin/finance/FinanceUi';
import { PeriodPicker } from './PeriodPicker';

const CODES = ['P', 'PL', 'HD', 'UL', 'UHD'] as const;
const now = new Date();

type DateCol = { date: string; kind: 'working' | 'weekly_off' | 'holiday'; holidayName: string | null };
type EmployeeRow = {
  id: string;
  employee_code: string;
  full_name: string;
  cells: Record<string, string>;
  totals: {
    eligibleWorkingDays: number;
    presentDays: number;
    paidLeaveRequested: number;
    unpaidLeave: number;
    halfDays: number;
    pendingDays: number;
  };
  leave: { allowedPaid: number; lop: number };
  pay: { payableDays: number } | null;
};

export default function AttendanceBoard() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'month' | 'day'>('month');
  const [day, setDay] = useState(now.toISOString().slice(0, 10));
  const [dates, setDates] = useState<DateCol[]>([]);
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [bulk, setBulk] = useState('P');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<Record<string, string>[]>([]);

  const load = async (nextYear = year, nextMonth = month, nextQuery = query) => {
    const params = new URLSearchParams({ year: String(nextYear), month: String(nextMonth), q: nextQuery });
    const response = await fetch(`/api/admin/hr/attendance?${params}`);
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || 'Could not load attendance');
      return;
    }
    setDates(body.dates || []);
    setRows(body.employees || []);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const save = async (updates: { employee_id: string; date: string; status: string | null }[], overwrite: boolean) => {
    setError('');
    setMessage('');
    const response = await fetch('/api/admin/hr/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates, overwrite, reason: 'Attendance correction' }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || 'Could not save attendance');
      return;
    }
    setMessage(`Saved ${body.saved} attendance mark${body.saved === 1 ? '' : 's'}${body.skipped ? `, left ${body.skipped} existing marks unchanged` : ''}.`);
    await load();
  };

  const markPending = () => {
    const updates = rows.flatMap((row) =>
      dates
        .filter((date) => date.kind === 'working' && !row.cells[date.date])
        .map((date) => ({ employee_id: row.id, date: date.date, status: bulk }))
    );
    if (!updates.length) {
      setMessage('No pending working days to update.');
      return;
    }
    void save(updates, false);
  };

  const showHistory = async (employeeId: string) => {
    const response = await fetch(`/api/admin/hr/attendance/${employeeId}/history?year=${year}&month=${month}`);
    const body = await response.json();
    setHistory(Array.isArray(body) ? body : []);
  };

  const dayColumn = dates.find((date) => date.date === day);

  return (
    <FinanceShell>
      <AdminPageHeader
        kicker="Human Resources"
        title="Daily Attendance"
        description="Blank working days stay pending. Weekends and holidays are excluded from payable days."
        action={<PeriodPicker year={year} month={month} onChange={(next) => { setYear(next.year); setMonth(next.month); }} />}
      />
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}
      <div className="flex flex-wrap items-center gap-2">
        <input className={`${adminInputClass} w-56`} placeholder="Search employee" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && load()} />
        <AdminButton onClick={() => load()}>Search</AdminButton>
        <AdminButton variant={mode === 'month' ? 'primary' : 'secondary'} onClick={() => setMode('month')}>Month</AdminButton>
        <AdminButton variant={mode === 'day' ? 'primary' : 'secondary'} onClick={() => setMode('day')}>Day</AdminButton>
        <select className={`${adminSelectClass} w-28`} value={bulk} onChange={(event) => setBulk(event.target.value)}>
          {CODES.map((code) => <option key={code}>{code}</option>)}
        </select>
        <AdminButton onClick={markPending}>Mark pending as {bulk}</AdminButton>
        <p className="text-xs text-slate-500">P present · PL paid leave · HD half paid leave · UL unpaid · UHD unpaid half-day</p>
      </div>
      {mode === 'day' ? (
        <div className="space-y-3">
          <input type="date" className={`${adminInputClass} w-44`} value={day} onChange={(event) => setDay(event.target.value)} />
          <p className="text-xs text-slate-500">{dayColumn ? (dayColumn.kind === 'working' ? 'Working day' : dayColumn.kind === 'holiday' ? `Holiday · ${dayColumn.holidayName}` : 'Weekly off') : 'Choose a date in this month.'}</p>
          <table className="w-full text-sm">
            <thead><tr><FinanceTh>Employee</FinanceTh><FinanceTh>Status</FinanceTh></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <FinanceTd>{row.full_name}<span className="ml-2 text-xs text-slate-400">{row.employee_code}</span></FinanceTd>
                  <FinanceTd>
                    {dayColumn?.kind === 'working' ? (
                      <select
                        className={`${adminSelectClass} w-28`}
                        value={row.cells[day] || ''}
                        onChange={(event) => save([{ employee_id: row.id, date: day, status: event.target.value || null }], true)}
                      >
                        <option value="">Pending</option>
                        {CODES.map((code) => <option key={code}>{code}</option>)}
                      </select>
                    ) : <span className="text-xs text-slate-400">{dayColumn?.kind === 'holiday' ? 'HOL' : 'WO'}</span>}
                  </FinanceTd>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-max text-xs">
            <thead>
              <tr>
                <FinanceTh className="sticky left-0 z-10 bg-slate-50">Employee</FinanceTh>
                {dates.map((date) => (
                  <FinanceTh key={date.date} className={date.kind === 'working' ? '' : 'text-slate-300'}>{date.date.slice(8)}</FinanceTh>
                ))}
                <FinanceTh>Present</FinanceTh>
                <FinanceTh>Paid leave</FinanceTh>
                <FinanceTh>Unpaid</FinanceTh>
                <FinanceTh>Half days</FinanceTh>
                <FinanceTh>LOP</FinanceTh>
                <FinanceTh>Payable</FinanceTh>
                <FinanceTh>Pending</FinanceTh>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <FinanceTd className="sticky left-0 z-10 bg-white whitespace-nowrap">
                    <button type="button" className="font-semibold text-slate-900" onClick={() => showHistory(row.id)}>{row.full_name}</button>
                    <p className="text-[10px] text-slate-400">{row.employee_code}</p>
                  </FinanceTd>
                  {dates.map((date) => (
                    <td key={date.date} className="border-b border-slate-100 px-1 py-1">
                      {date.kind === 'working' ? (
                        <select
                          className="w-14 rounded border border-slate-200 bg-white px-1 py-1"
                          value={row.cells[date.date] || ''}
                          onChange={(event) => save([{ employee_id: row.id, date: date.date, status: event.target.value || null }], true)}
                        >
                          <option value="">—</option>
                          {CODES.map((code) => <option key={code}>{code}</option>)}
                        </select>
                      ) : <span className="px-1 text-slate-300">{date.kind === 'holiday' ? 'HOL' : 'WO'}</span>}
                    </td>
                  ))}
                  <FinanceTd>{row.totals.presentDays}</FinanceTd>
                  <FinanceTd>{row.leave.allowedPaid}</FinanceTd>
                  <FinanceTd>{row.totals.unpaidLeave}</FinanceTd>
                  <FinanceTd>{row.totals.halfDays}</FinanceTd>
                  <FinanceTd>{row.leave.lop}</FinanceTd>
                  <FinanceTd>{row.pay?.payableDays ?? '—'}</FinanceTd>
                  <FinanceTd>{row.totals.pendingDays}</FinanceTd>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {history.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
          <p className="mb-2 font-semibold text-slate-900">Recent attendance changes</p>
          {history.map((item, index) => (
            <p key={index} className="text-slate-600">{item.attendance_date}: {item.previous_status || 'blank'} → {item.next_status || 'blank'}</p>
          ))}
        </div>
      ) : null}
    </FinanceShell>
  );
}
