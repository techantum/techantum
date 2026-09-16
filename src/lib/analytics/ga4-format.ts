export type AnalyticsRange =
  | 'today'
  | 'yesterday'
  | '7d'
  | 'week'
  | '28d'
  | 'month'
  | '90d'
  | 'custom';

export const ANALYTICS_RANGE_LABELS: Record<AnalyticsRange, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  '7d': 'Last 7 days',
  week: 'Last week',
  '28d': 'Last 28 days',
  month: 'Last month',
  '90d': 'Last 90 days',
  custom: 'Custom range',
};

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
}

export function formatGa4Date(date: string): string {
  if (date.length !== 8) return date;
  const y = date.slice(0, 4);
  const m = date.slice(4, 6);
  const d = date.slice(6, 8);
  return new Date(`${y}-${m}-${d}T00:00:00`).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
  });
}

export function getAnalyticsRangeLabel(range: AnalyticsRange): string {
  return ANALYTICS_RANGE_LABELS[range];
}
