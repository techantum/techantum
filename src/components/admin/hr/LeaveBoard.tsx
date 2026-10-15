'use client';

import { useEffect, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import AdminField, { adminInputClass, adminSelectClass } from '@/components/admin/AdminField';
import AdminFormGrid from '@/components/admin/AdminFormGrid';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { FinanceShell, FinanceTd, FinanceTh } from '@/components/admin/finance/FinanceUi';
import { PeriodPicker } from './PeriodPicker';

const now = new Date();

export default function LeaveBoard() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<Record<string, string | number>[]>([]);
  const [employees, setEmployees] = useState<{ id: string; full_name: string; employee_code: string }[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [adjustment, setAdjustment] = useState({ employee_id: '', amount: '', reason: '' });
  const [opening, setOpening] = useState({ employee_id: '', balance: '', note: '' });

  const load = async (nextYear = year, nextMonth = month) => {
    const params = new URLSearchParams({ year: String(nextYear), month: String(nextMonth), q: query });
    const response = await fetch(`/api/admin/hr/leave?${params}`);
    const body = await response.json();
    if (!response.ok) setError(body.error || 'Could not load leave');
    else {
      setError('');
      setRows(body.rows || []);
    }
  };

  useEffect(() => {
    void fetch('/api/admin/finance/employees')
      .then((response) => response.json())
      .then((list) => {
        const people = Array.isArray(list) ? list : [];
        setEmployees(people.filter((employee) => employee.status !== 'inactive'));
      })
      .catch(() => setEmployees([]));
  }, []);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const post = async (path: string, payload: Record<string, unknown>, success: string) => {
    setError('');
    setMessage('');
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || 'Could not save');
      return;
    }
    setMessage(success);
    await load();
  };

  return (
    <FinanceShell>
      <AdminPageHeader
        kicker="Human Resources"
        title="Leave Management"
        description="Balances come from attendance. One paid leave is credited each eligible month and unused leave carries forward, up to five paid days in a month."
        action={<PeriodPicker year={year} month={month} onChange={(next) => { setYear(next.year); setMonth(next.month); }} />}
      />
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}
      <div className="flex gap-2">
        <input className={`${adminInputClass} w-56`} placeholder="Search employee" value={query} onChange={(event) => setQuery(event.target.value)} />
        <AdminButton onClick={() => load()}>Search</AdminButton>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr>
              <FinanceTh>Employee</FinanceTh>
              <FinanceTh>Opening</FinanceTh>
              <FinanceTh>Credit</FinanceTh>
              <FinanceTh>Available</FinanceTh>
              <FinanceTh>Paid leave used</FinanceTh>
              <FinanceTh>Unpaid</FinanceTh>
              <FinanceTh>Closing</FinanceTh>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <FinanceTd className="text-slate-500">No employees are employed in this month.</FinanceTd>
              </tr>
            ) : null}
            {rows.map((row) => (
              <tr key={String(row.id)}>
                <FinanceTd className="whitespace-nowrap">
                  {row.full_name}
                  <span className="ml-2 text-xs text-slate-400">{row.employee_code}</span>
                  {row.calculation_error ? <span className="mt-1 block text-xs text-rose-600">{row.calculation_error}</span> : null}
                </FinanceTd>
                <FinanceTd>{row.opening}</FinanceTd>
                <FinanceTd>{row.credit}</FinanceTd>
                <FinanceTd>{row.available}</FinanceTd>
                <FinanceTd>{row.allowedPaid}</FinanceTd>
                <FinanceTd>{row.unpaid}</FinanceTd>
                <FinanceTd>{row.closing}</FinanceTd>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <form className="rounded-2xl border border-slate-200 bg-white p-4" onSubmit={(event) => { event.preventDefault(); void post('/api/admin/hr/leave/adjustments', { ...adjustment, year, month }, 'Leave adjustment saved'); }}>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Manual adjustment</h2>
          <AdminFormGrid>
            <AdminField label="Employee">
              <select className={adminSelectClass} value={adjustment.employee_id} onChange={(event) => setAdjustment({ ...adjustment, employee_id: event.target.value })}>
                <option value="">Select</option>
                {(employees.length ? employees : rows).map((row) => <option key={String(row.id)} value={String(row.id)}>{row.full_name}</option>)}
              </select>
            </AdminField>
            <AdminField label="Days"><input className={adminInputClass} value={adjustment.amount} onChange={(event) => setAdjustment({ ...adjustment, amount: event.target.value })} /></AdminField>
            <AdminField label="Reason" span={2}><input className={adminInputClass} value={adjustment.reason} onChange={(event) => setAdjustment({ ...adjustment, reason: event.target.value })} /></AdminField>
          </AdminFormGrid>
          <AdminButton className="mt-3" variant="primary" type="submit">Save adjustment</AdminButton>
        </form>
        <form className="rounded-2xl border border-slate-200 bg-white p-4" onSubmit={(event) => { event.preventDefault(); void post('/api/admin/hr/leave/opening', { ...opening, year, month }, 'Opening balance saved'); }}>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Opening balance</h2>
          <AdminFormGrid>
            <AdminField label="Employee">
              <select className={adminSelectClass} value={opening.employee_id} onChange={(event) => setOpening({ ...opening, employee_id: event.target.value })}>
                <option value="">Select</option>
                {(employees.length ? employees : rows).map((row) => <option key={String(row.id)} value={String(row.id)}>{row.full_name}</option>)}
              </select>
            </AdminField>
            <AdminField label="Balance"><input className={adminInputClass} value={opening.balance} onChange={(event) => setOpening({ ...opening, balance: event.target.value })} /></AdminField>
            <AdminField label="Note" span={2}><input className={adminInputClass} value={opening.note} onChange={(event) => setOpening({ ...opening, note: event.target.value })} /></AdminField>
          </AdminFormGrid>
          <AdminButton className="mt-3" type="submit">Save opening balance</AdminButton>
        </form>
      </div>
    </FinanceShell>
  );
}
