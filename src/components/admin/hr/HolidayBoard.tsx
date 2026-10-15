'use client';

import { useEffect, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import AdminField, { adminInputClass } from '@/components/admin/AdminField';
import AdminFormGrid from '@/components/admin/AdminFormGrid';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { FinanceShell, FinanceTd, FinanceTh } from '@/components/admin/finance/FinanceUi';
import { PeriodPicker } from './PeriodPicker';

const now = new Date();

export default function HolidayBoard() {
  const [year, setYear] = useState(now.getFullYear());
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [form, setForm] = useState({ id: '', holiday_date: '', name: '', holiday_type: 'company' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async (nextYear = year) => {
    const response = await fetch(`/api/admin/hr/holidays?year=${nextYear}`);
    const body = await response.json();
    if (!response.ok) setError(body.error || 'Could not load holidays');
    else setRows(body);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const save = async () => {
    setError('');
    setMessage('');
    const response = await fetch(form.id ? `/api/admin/hr/holidays/${form.id}` : '/api/admin/hr/holidays', {
      method: form.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || 'Could not save holiday');
      return;
    }
    setMessage('Holiday saved');
    setForm({ id: '', holiday_date: '', name: '', holiday_type: 'company' });
    await load();
  };

  const remove = async (id: string) => {
    const response = await fetch(`/api/admin/hr/holidays/${id}`, { method: 'DELETE' });
    const body = await response.json();
    if (!response.ok) setError(body.error || 'Could not delete holiday');
    else await load();
  };

  return (
    <FinanceShell>
      <AdminPageHeader
        kicker="Human Resources"
        title="Holiday Management"
        description="Holidays on a weekend stay weekly offs, so they are not removed from working days twice."
        action={<PeriodPicker year={year} yearOnly onChange={(next) => setYear(next.year)} />}
      />
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <AdminFormGrid>
          <AdminField label="Date"><input type="date" className={adminInputClass} value={form.holiday_date} onChange={(event) => setForm({ ...form, holiday_date: event.target.value })} /></AdminField>
          <AdminField label="Name"><input className={adminInputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></AdminField>
          <AdminField label="Type"><input className={adminInputClass} value={form.holiday_type} onChange={(event) => setForm({ ...form, holiday_type: event.target.value })} /></AdminField>
        </AdminFormGrid>
        <div className="mt-3 flex gap-2">
          <AdminButton variant="primary" onClick={save}>{form.id ? 'Update holiday' : 'Add holiday'}</AdminButton>
          {form.id ? <AdminButton onClick={() => setForm({ id: '', holiday_date: '', name: '', holiday_type: 'company' })}>Cancel</AdminButton> : null}
        </div>
      </div>
      <table className="w-full text-sm">
        <thead><tr><FinanceTh>Date</FinanceTh><FinanceTh>Name</FinanceTh><FinanceTh>Type</FinanceTh><FinanceTh> </FinanceTh></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <FinanceTd>{row.holiday_date}</FinanceTd>
              <FinanceTd>{row.name}</FinanceTd>
              <FinanceTd>{row.holiday_type}</FinanceTd>
              <FinanceTd className="whitespace-nowrap">
                <button type="button" className="mr-3 text-xs font-semibold text-secondary" onClick={() => setForm({ id: row.id, holiday_date: row.holiday_date, name: row.name, holiday_type: row.holiday_type })}>Edit</button>
                <button type="button" className="text-xs font-semibold text-rose-600" onClick={() => remove(row.id)}>Delete</button>
              </FinanceTd>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? <p className="text-sm text-slate-400">No holidays saved for this year. The reference workbook was not in the repository, so the calendar starts empty.</p> : null}
    </FinanceShell>
  );
}
