'use client';

import { useEffect, useState } from 'react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function MyPayslips() {
  const [rows, setRows] = useState<{ id: string; payroll_month: number; payroll_year: number; payslip_date: string }[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch('/api/admin/my-payslips')
      .then((r) => r.json())
      .then((body) => {
        setRows(Array.isArray(body.rows) ? body.rows : []);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  if (!ready || !rows.length) return null;

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="font-bricolage font-semibold text-slate-900">My Payslips</h2>
        <p className="text-xs text-slate-500">Payslips mapped to your employee ID. Download only.</p>
      </div>
      <ul className="divide-y divide-slate-100">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 px-5 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">
                {MONTHS[Number(row.payroll_month) - 1] || row.payroll_month} {row.payroll_year}
              </p>
              <p className="text-xs text-slate-500">
                {row.payslip_date
                  ? new Date(`${row.payslip_date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '—'}
              </p>
            </div>
            <a
              className="text-sm font-semibold text-secondary hover:underline"
              href={`/api/admin/my-payslips/${row.id}`}
            >
              Download
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
