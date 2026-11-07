'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import AdminField, { adminInputClass } from '@/components/admin/AdminField';
import AdminFormGrid from '@/components/admin/AdminFormGrid';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatusModal from '@/components/admin/AdminStatusModal';
import { FinanceShell, FinanceTd, FinanceTh } from '@/components/admin/finance/FinanceUi';
import { PeriodPicker } from './PeriodPicker';

const now = new Date();
const emptyForm = { id: '', holiday_date: '', name: '', holiday_type: 'company' };

export default function HolidayBoard() {
  const [year, setYear] = useState(now.getFullYear());
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [baseline, setBaseline] = useState(emptyForm);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusModal, setStatusModal] = useState<{ title: string; message: string; variant: 'success' | 'error' } | null>(null);

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

  const dirty = useMemo(() => {
    if (!form.holiday_date || !form.name.trim()) return false;
    if (!form.id) return true;
    return (
      form.holiday_date !== baseline.holiday_date ||
      form.name.trim() !== baseline.name.trim() ||
      form.holiday_type.trim() !== baseline.holiday_type.trim()
    );
  }, [baseline, form]);

  const save = async () => {
    setError('');
    setMessage('');
    if (!dirty) {
      setError(form.id ? 'No holiday changes to save.' : 'Enter a date and name before saving.');
      return;
    }
    const clash = rows.find((row) => row.holiday_date === form.holiday_date && row.id !== form.id);
    if (clash) {
      setError(`A holiday already exists on ${form.holiday_date} (${clash.name}). Edit that holiday instead.`);
      return;
    }
    setSaving(true);
    const response = await fetch(form.id ? `/api/admin/hr/holidays/${form.id}` : '/api/admin/hr/holidays', {
      method: form.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const body = await response.json();
    setSaving(false);
    if (!response.ok) {
      const next = body.error || 'Could not save holiday';
      setError(next);
      setStatusModal({ title: 'Save failed', message: next, variant: 'error' });
      return;
    }
    setMessage('Holiday saved');
    setStatusModal({ title: 'Holiday saved', message: 'The holiday calendar was updated.', variant: 'success' });
    setForm(emptyForm);
    setBaseline(emptyForm);
    await load();
  };

  const remove = async (id: string) => {
    const response = await fetch(`/api/admin/hr/holidays/${id}`, { method: 'DELETE' });
    const body = await response.json();
    if (!response.ok) {
      const next = body.error || 'Could not delete holiday';
      setError(next);
      setStatusModal({ title: 'Delete failed', message: next, variant: 'error' });
    } else {
      setStatusModal({ title: 'Holiday deleted', message: 'The holiday was removed from the calendar.', variant: 'success' });
      await load();
    }
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
          <AdminField label="Name"><input className={adminInputClass} placeholder="Holiday name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></AdminField>
          <AdminField label="Type"><input className={adminInputClass} placeholder="company" value={form.holiday_type} onChange={(event) => setForm({ ...form, holiday_type: event.target.value })} /></AdminField>
        </AdminFormGrid>
        <div className="mt-3 flex gap-2">
          <AdminButton variant="primary" onClick={save} disabled={!dirty || saving}>
            {saving ? 'Saving...' : form.id ? 'Update holiday' : 'Add holiday'}
          </AdminButton>
          {form.id ? (
            <AdminButton
              onClick={() => {
                setForm(emptyForm);
                setBaseline(emptyForm);
                setError('');
                setMessage('');
              }}
            >
              Cancel
            </AdminButton>
          ) : null}
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
                <button
                  type="button"
                  className="mr-3 text-xs font-semibold text-secondary"
                  onClick={() => {
                    const next = { id: row.id, holiday_date: row.holiday_date, name: row.name, holiday_type: row.holiday_type };
                    setForm(next);
                    setBaseline(next);
                    setError('');
                    setMessage('');
                  }}
                >
                  Edit
                </button>
                <button type="button" className="text-xs font-semibold text-rose-600" onClick={() => remove(row.id)}>Delete</button>
              </FinanceTd>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? <p className="text-sm text-slate-400">No holidays saved for this year. The reference workbook was not in the repository, so the calendar starts empty.</p> : null}
      <AdminStatusModal
        open={Boolean(statusModal)}
        title={statusModal?.title || ''}
        message={statusModal?.message || ''}
        variant={statusModal?.variant || 'success'}
        onClose={() => setStatusModal(null)}
      />
    </FinanceShell>
  );
}
