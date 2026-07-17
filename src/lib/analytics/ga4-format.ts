export type AnalyticsRange = '7d' | '28d' | '90d';

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
  const labels: Record<AnalyticsRange, string> = {
    '7d': 'Last 7 days',
    '28d': 'Last 28 days',
    '90d': 'Last 90 days',
  };
  return labels[range];
}
