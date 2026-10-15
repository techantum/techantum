'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import Icon from '@/components/ui/AppIcon';
import AdminButton from '@/components/admin/AdminButton';
import { currentFinancialYear } from '@/lib/finance/fy';

const controlClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-white text-sm text-slate-800 shadow-sm transition-colors hover:border-slate-300 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20';

export function FilterBar({
  onSearch,
  onClear,
  searchLabel = 'Search',
  extra,
  plain = false,
  children,
}: {
  onSearch: () => void;
  onClear: () => void;
  searchLabel?: string;
  extra?: ReactNode;
  plain?: boolean;
  children: ReactNode;
}) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSearch();
  };

  const form = (
    <form className={`flex flex-wrap items-center gap-3 p-4 ${plain ? 'border-b border-slate-100' : ''}`} onSubmit={submit}>
      {children}
      <AdminButton variant="primary" type="submit">
        <Icon name="MagnifyingGlassIcon" size={16} />
        {searchLabel}
      </AdminButton>
      <AdminButton type="button" onClick={onClear}>
        <Icon name="ArrowPathIcon" size={16} />
        Clear
      </AdminButton>
      {extra}
    </form>
  );

  if (plain) return form;

  return (
    <section className="w-full rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <Icon name="AdjustmentsHorizontalIcon" size={18} className="text-slate-500" />
        <h2 className="font-bricolage font-semibold text-slate-900">Filters</h2>
      </div>
      {form}
    </section>
  );
}

export function FilterSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative min-w-[220px] flex-1">
      <Icon name="MagnifyingGlassIcon" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`${controlClass} pl-9 pr-3`}
      />
    </label>
  );
}

export function FilterSelect({
  value,
  onChange,
  icon = 'QueueListIcon',
  children,
  className = 'w-52',
}: {
  value: string;
  onChange: (value: string) => void;
  icon?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`relative ${className}`}>
      <Icon name={icon} size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <select value={value} onChange={(event) => onChange(event.target.value)} className={`${controlClass} appearance-none pl-9 pr-8`}>
        {children}
      </select>
      <Icon name="ChevronDownIcon" size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
    </label>
  );
}

export function FilterDate({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  return (
    <label className="relative w-40">
      <Icon name="CalendarDaysIcon" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="date"
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${controlClass} pl-9 pr-2`}
      />
    </label>
  );
}

export function financialYearChoices(selected?: string) {
  const current = currentFinancialYear().startYear;
  const options: string[] = [];
  for (let year = current + 1; year >= current - 4; year -= 1) {
    options.push(`${year}-${String(year + 1).slice(-2)}`);
  }
  if (selected && !options.includes(selected)) options.unshift(selected);
  return options;
}

export function EmptyRecords({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-14 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-50 text-sky-300">
        <Icon name="DocumentTextIcon" size={28} />
      </div>
      <p className="font-bricolage text-lg font-semibold text-slate-900">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function useListFilters<T extends Record<string, string>>(initial: T) {
  const [draft, setDraft] = useState(initial);
  const [applied, setApplied] = useState({ ...initial, page: 1 });

  const set = (key: keyof T & string, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const search = () => setApplied({ ...draft, page: 1 });

  const clear = () => {
    setDraft(initial);
    setApplied({ ...initial, page: 1 });
  };

  const setPage = (page: number) => setApplied((current) => ({ ...current, page }));
  const reload = () => setApplied((current) => ({ ...current }));

  return { draft, applied, set, search, clear, setPage, reload };
}
