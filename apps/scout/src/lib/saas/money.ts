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

export function timeAgo(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  const mins = Math.round((Date.now() - date.getTime()) / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatDateIn(value);
}

export function monthDelta(current: number, previous: number) {
  if (!previous && !current) return null;
  if (!previous) return { text: `+${current} this month`, up: true };
  const diff = current - previous;
  if (!diff) return { text: 'Same as last month', up: true };
  const pct = Math.round((diff / previous) * 100);
  return { text: `${diff > 0 ? '+' : ''}${pct}% vs last month`, up: diff > 0 };
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
