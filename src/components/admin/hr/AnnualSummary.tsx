'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { FinanceShell, FinanceTd, FinanceTh, StatusBadge } from '@/components/admin/finance/FinanceUi';
import { PeriodPicker, inr } from './PeriodPicker';

const now = new Date();

export default function AnnualSummary() {
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<{ companyMonths: Record<string, number>[]; payroll: Record<string, string>[]; leave: Record<string, string>[] } | null>(null);

  useEffect(() => {
    fetch(`/api/admin/hr/annual?year=${year}`).then((response) => response.json()).then(setData);
  }, [year]);

  return (
    <FinanceShell>
      <AdminPageHeader
        kicker="Human Resources"
        title="Annual Payroll Summary"
        description="Company working days are the calendar count. Employee rows are not added together to make that count."
        action={<PeriodPicker year={year} yearOnly onChange={(next) => setYear(next.year)} />}
      />
      <div className="flex gap-2 text-sm font-semibold">
        <a className="rounded-full border border-slate-200 px-3 py-1.5" href={`/api/admin/hr/annual/export?year=${year}`}>Excel</a>
        <a className="rounded-full border border-slate-200 px-3 py-1.5" href={`/api/admin/hr/annual/pdf?year=${year}`}>PDF</a>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead><tr><FinanceTh>Month</FinanceTh><FinanceTh>Working days</FinanceTh><FinanceTh>Weekly off</FinanceTh><FinanceTh>Holidays</FinanceTh></tr></thead>
          <tbody>
            {(data?.companyMonths || []).map((month) => (
              <tr key={month.month}><FinanceTd>{month.month}</FinanceTd><FinanceTd>{month.workingDays}</FinanceTd><FinanceTd>{month.weeklyOff}</FinanceTd><FinanceTd>{month.holidays}</FinanceTd></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr>
              <FinanceTh>Employee</FinanceTh><FinanceTh>Month</FinanceTh><FinanceTh>Gross</FinanceTh><FinanceTh>Net</FinanceTh>
              <FinanceTh>Paid leave</FinanceTh><FinanceTh>Unpaid</FinanceTh><FinanceTh>LOP deduction</FinanceTh><FinanceTh>Status</FinanceTh>
            </tr>
          </thead>
          <tbody>
            {(data?.payroll || []).map((row) => (
              <tr key={row.id}>
                <FinanceTd className="whitespace-nowrap">{row.full_name}</FinanceTd>
                <FinanceTd>{row.payroll_month}</FinanceTd>
                <FinanceTd>{inr(row.monthly_gross)}</FinanceTd>
                <FinanceTd>{inr(row.net_payable)}</FinanceTd>
                <FinanceTd>{row.paid_leave_days}</FinanceTd>
                <FinanceTd>{row.unpaid_leave}</FinanceTd>
                <FinanceTd>{inr(row.lop_deduction)}</FinanceTd>
                <FinanceTd><StatusBadge value={row.status} /></FinanceTd>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead><tr><FinanceTh>Employee</FinanceTh><FinanceTh>Month</FinanceTh><FinanceTh>Opening</FinanceTh><FinanceTh>Credit</FinanceTh><FinanceTh>Used</FinanceTh><FinanceTh>Closing</FinanceTh></tr></thead>
          <tbody>
            {(data?.leave || []).map((row) => (
              <tr key={row.id}>
                <FinanceTd>{row.full_name}</FinanceTd>
                <FinanceTd>{row.payroll_month}</FinanceTd>
                <FinanceTd>{row.opening_balance}</FinanceTd>
                <FinanceTd>{row.monthly_credit}</FinanceTd>
                <FinanceTd>{row.allowed_paid}</FinanceTd>
                <FinanceTd>{row.closing_balance}</FinanceTd>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FinanceShell>
  );
}
