'use client';

import { useEffect, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import AdminField, { adminInputClass, adminSelectClass } from '@/components/admin/AdminField';
import AdminFormGrid from '@/components/admin/AdminFormGrid';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { FinanceShell } from '@/components/admin/finance/FinanceUi';

const empty = {
  weekly_off: '0,6',
  monthly_leave_credit: '1',
  max_paid_leave_per_month: '5',
  carry_forward: true,
  half_day_value: '0.5',
  currency: 'INR',
  approval_required: true,
  joining_month_credit: 'full',
  opening_balance_default: '0',
};

export default function PayrollSettingsForm() {
  const [form, setForm] = useState(empty);
  const [version, setVersion] = useState(1);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/admin/hr/settings')
      .then((response) => response.json())
      .then((body) => {
        if (body.error) return;
        setVersion(body.version || 1);
        setForm({
          weekly_off: (body.weeklyOff || [0, 6]).join(','),
          monthly_leave_credit: String(body.monthlyLeaveCredit),
          max_paid_leave_per_month: String(body.maxPaidLeavePerMonth),
          carry_forward: body.carryForward,
          half_day_value: String(body.halfDayValue),
          currency: body.currency,
          approval_required: body.approvalRequired,
          joining_month_credit: body.joiningMonthCredit,
          opening_balance_default: String(body.openingBalanceDefault),
        });
      });
  }, []);

  const save = async () => {
    setError('');
    setMessage('');
    const response = await fetch('/api/admin/hr/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, weekly_off: form.weekly_off.split(',').map((part) => Number(part.trim())) }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || 'Could not save settings');
      return;
    }
    setVersion(body.version);
    setMessage('Settings saved. Approved payroll is unchanged. Draft payroll was recalculated.');
  };

  return (
    <FinanceShell>
      <AdminPageHeader kicker="Human Resources" title="Payroll Settings" description={`Version ${version}. Salary is monthly gross divided by working days.`} />
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <AdminFormGrid>
          <AdminField label="Weekly off" hint="0 is Sunday and 6 is Saturday."><input className={adminInputClass} value={form.weekly_off} onChange={(event) => setForm({ ...form, weekly_off: event.target.value })} /></AdminField>
          <AdminField label="Monthly paid leave credit"><input className={adminInputClass} value={form.monthly_leave_credit} onChange={(event) => setForm({ ...form, monthly_leave_credit: event.target.value })} /></AdminField>
          <AdminField label="Maximum paid leave per month"><input className={adminInputClass} value={form.max_paid_leave_per_month} onChange={(event) => setForm({ ...form, max_paid_leave_per_month: event.target.value })} /></AdminField>
          <AdminField label="Half-day value"><input className={adminInputClass} value={form.half_day_value} onChange={(event) => setForm({ ...form, half_day_value: event.target.value })} /></AdminField>
          <AdminField label="Currency"><input className={adminInputClass} value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })} /></AdminField>
          <AdminField label="Opening balance default"><input className={adminInputClass} value={form.opening_balance_default} onChange={(event) => setForm({ ...form, opening_balance_default: event.target.value })} /></AdminField>
          <AdminField label="Joining-month credit">
            <select className={adminSelectClass} value={form.joining_month_credit} onChange={(event) => setForm({ ...form, joining_month_credit: event.target.value })}>
              <option value="full">Credit the full day if employed any day</option>
              <option value="none">Credit only for a complete calendar month</option>
            </select>
          </AdminField>
          <AdminField label="Carry forward">
            <select className={adminSelectClass} value={form.carry_forward ? 'yes' : 'no'} onChange={(event) => setForm({ ...form, carry_forward: event.target.value === 'yes' })}>
              <option value="yes">Enabled</option>
              <option value="no">Disabled</option>
            </select>
          </AdminField>
          <AdminField label="Approval">
            <select className={adminSelectClass} value={form.approval_required ? 'yes' : 'no'} onChange={(event) => setForm({ ...form, approval_required: event.target.value === 'yes' })}>
              <option value="yes">Required before payslips</option>
              <option value="no">Recorded, still required by payroll status</option>
            </select>
          </AdminField>
        </AdminFormGrid>
        <AdminButton className="mt-3" variant="primary" onClick={save}>Save settings</AdminButton>
      </div>
    </FinanceShell>
  );
}
