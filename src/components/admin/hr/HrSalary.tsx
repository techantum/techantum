'use client';

import { useEffect, useState } from 'react';
import { formatINR, toCents } from '@/lib/finance/money';

export type SalaryVisibility = 'visible' | 'blur' | 'hidden';

let cached: SalaryVisibility | null = null;
let pending: Promise<SalaryVisibility> | null = null;

async function loadSalaryVisibility(): Promise<SalaryVisibility> {
  if (cached) return cached;
  if (!pending) {
    pending = fetch('/api/admin/hr/settings')
      .then((response) => response.json())
      .then((body) => {
        const value = String(body.salaryVisibility || body.salary_visibility || 'visible');
        cached = value === 'blur' || value === 'hidden' ? value : 'visible';
        return cached;
      })
      .catch(() => {
        cached = 'visible';
        return cached as SalaryVisibility;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

export function invalidateSalaryVisibilityCache() {
  cached = null;
}

export function useSalaryVisibility() {
  const [visibility, setVisibility] = useState<SalaryVisibility>(cached || 'visible');
  useEffect(() => {
    void loadSalaryVisibility().then(setVisibility);
  }, []);
  return visibility;
}

/** Rupee display that respects HR salary visibility (visible / blur / hidden). */
export function HrSalary({
  value,
  formatted,
  asCents = false,
  className = '',
}: {
  value?: unknown;
  /** Preformatted label; used when value formatting is custom. */
  formatted?: string;
  /** When true, `value` is already integer paise. */
  asCents?: boolean;
  className?: string;
}) {
  const visibility = useSalaryVisibility();
  let text = formatted ?? '—';
  if (formatted == null) {
    if (value == null || value === '') text = '—';
    else {
      try {
        text = formatINR(asCents ? Number(value) : toCents(value));
      } catch {
        text = String(value);
      }
    }
  }
  if (visibility === 'hidden') {
    return <span className={`select-none text-slate-400 ${className}`}>••••••</span>;
  }
  if (visibility === 'blur') {
    return (
      <span className={`inline-block select-none blur-[6px] ${className}`} title="Salary blurred by HR settings">
        {text}
      </span>
    );
  }
  return <span className={className}>{text}</span>;
}
