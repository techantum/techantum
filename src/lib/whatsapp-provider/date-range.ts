import type { DateRangeKey } from './types';

export function resolveDateRange(key: DateRangeKey, from?: string, to?: string) {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  let start = startOfDay(now);
  let end = endOfDay(now);

  if (key === 'yesterday') {
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    start = startOfDay(y);
    end = endOfDay(y);
  } else if (key === 'last_7') {
    start = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
  } else if (key === 'last_30') {
    start = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));
  } else if (key === 'this_month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (key === 'previous_month') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  } else if (key === 'custom' && from && to) {
    start = startOfDay(new Date(from));
    end = endOfDay(new Date(to));
  }

  return { start: start.toISOString(), end: end.toISOString(), startDate: start, endDate: end };
}

export function previousRange(start: Date, end: Date) {
  const duration = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - duration);
  return { start: prevStart.toISOString(), end: prevEnd.toISOString() };
}

export function rate(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}
