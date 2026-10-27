export function formatInr(amount: number | string | null | undefined, options?: { withCycle?: 'monthly' | 'yearly' | null }) {
  const value = Number(amount || 0);
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
  if (options?.withCycle === 'yearly') return `${formatted} / year`;
  if (options?.withCycle === 'monthly') return `${formatted} / month`;
  return formatted;
}

export function formatInrCompact(amount: number | string | null | undefined) {
  return formatInr(amount);
}

export function formatDateIn(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function planTone(name?: string | null) {
  const key = (name || '').toLowerCase();
  if (key.includes('growth')) return 'bg-violet-100 text-violet-700';
  if (key.includes('starter')) return 'bg-sky-100 text-sky-700';
  if (key.includes('business') || key.includes('scale')) return 'bg-orange-100 text-orange-700';
  return 'bg-slate-100 text-slate-600';
}

export function packageIconTone(name?: string | null, index = 0) {
  const key = (name || '').toLowerCase();
  if (key.includes('starter')) return 'bg-sky-50 text-sky-600';
  if (key.includes('growth')) return 'bg-violet-50 text-violet-600';
  if (key.includes('business') || key.includes('scale')) return 'bg-amber-50 text-amber-600';
  return ['bg-sky-50 text-sky-600', 'bg-violet-50 text-violet-600', 'bg-amber-50 text-amber-600'][index % 3];
}
