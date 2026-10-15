'use client';

import { adminInputClass, adminSelectClass } from '@/components/admin/AdminField';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function PeriodPicker({
  year,
  month,
  onChange,
  yearOnly = false,
}: {
  year: number;
  month?: number;
  onChange: (next: { year: number; month: number }) => void;
  yearOnly?: boolean;
}) {
  return (
    <div className="flex gap-2">
      {yearOnly ? null : (
        <select className={adminSelectClass} value={month} onChange={(event) => onChange({ year, month: Number(event.target.value) })}>
          {MONTHS.map((name, index) => (
            <option key={name} value={index + 1}>{name}</option>
          ))}
        </select>
      )}
      <input
        className={`${adminInputClass} w-28`}
        inputMode="numeric"
        value={year}
        onChange={(event) => onChange({ year: Number(event.target.value) || year, month: month || 1 })}
      />
    </div>
  );
}

export function inr(value: unknown) {
  if (value == null || value === '') return '—';
  return `₹${value}`;
}
