'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatCard from '@/components/admin/AdminStatCard';
import { FinanceShell } from '@/components/admin/finance/FinanceUi';
import { inr } from './PeriodPicker';

const links = [
  ['/admin/hr/attendance', 'Attendance'],
  ['/admin/hr/leave', 'Leave'],
  ['/admin/hr/payroll', 'Monthly payroll'],
  ['/admin/hr/payslips', 'Payslips'],
];

export default function HrDashboard() {
  const [data, setData] = useState<Record<string, string | number> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/hr/dashboard')
      .then((response) => response.json())
      .then((body) => {
        if (body.error) setError(body.error);
        else setData(body);
      })
      .catch(() => setError('Could not load the HR dashboard'));
  }, []);

  return (
    <FinanceShell>
      <AdminPageHeader kicker="Human Resources" title="HR Dashboard" description="Attendance, leave and the current month payroll." />
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Active employees" value={data?.activeEmployees ?? '—'} icon="UsersIcon" />
        <AdminStatCard label="Present today" value={data?.presentToday ?? '—'} icon="CheckCircleIcon" accent="green" />
        <AdminStatCard label="On leave today" value={data?.onLeaveToday ?? '—'} icon="CalendarDaysIcon" accent="amber" />
        <AdminStatCard label="Attendance pending" value={data?.attendancePending ?? '—'} icon="ClockIcon" accent="rose" />
        <AdminStatCard label="Available paid leave" value={data?.availablePaidLeave ?? '—'} icon="ClipboardDocumentCheckIcon" />
        <AdminStatCard label="Gross payroll" value={data ? inr(data.grossPayroll) : '—'} icon="BanknotesIcon" />
        <AdminStatCard label="LOP deduction" value={data ? inr(data.lopDeduction) : '—'} icon="MinusCircleIcon" accent="rose" />
        <AdminStatCard label="Net payroll" value={data ? inr(data.netPayroll) : '—'} icon="CurrencyRupeeIcon" accent="green" />
      </div>
      <div className="flex flex-wrap gap-2">
        {links.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-secondary/40 hover:text-secondary">
            {label}
          </Link>
        ))}
      </div>
    </FinanceShell>
  );
}
