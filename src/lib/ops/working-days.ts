/** Working-day scheduling: Mon–Fri, 8 hours per developer per day. Start date is Working Day 1. */

export const HOURS_PER_DEVELOPER_PER_DAY = 8;
export const SCHEDULE_TIMEZONE = 'Asia/Kolkata';

export function todayISO(timeZone = SCHEDULE_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function parseISODate(iso: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) throw new Error('Date must be YYYY-MM-DD.');
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(date.getTime())) throw new Error('Invalid date.');
  return date;
}

export function formatISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

export function weekdayLabel(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-IN', {
    weekday: 'long',
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function requiredWorkingDays(hours: number, developers: number): number {
  if (!Number.isFinite(hours) || hours <= 0) throw new Error('Estimated hours must be greater than 0.');
  if (!Number.isFinite(developers) || developers < 1) throw new Error('Number of developers must be at least 1.');
  const capacity = developers * HOURS_PER_DEVELOPER_PER_DAY;
  return Math.ceil(hours / capacity);
}

export function dailyTeamCapacity(developers: number): number {
  if (!Number.isFinite(developers) || developers < 1) throw new Error('Number of developers must be at least 1.');
  return developers * HOURS_PER_DEVELOPER_PER_DAY;
}

/**
 * Start date counts as working day 1. Weekends are skipped when advancing.
 * Start date must be Monday–Friday.
 */
export function addWorkingDays(startISO: string, workingDays: number): string {
  if (!Number.isFinite(workingDays) || workingDays < 1) {
    throw new Error('Working days must be at least 1.');
  }
  const cursor = parseISODate(startISO);
  if (isWeekend(cursor)) {
    throw new Error('Start date must be a weekday (Monday–Friday).');
  }
  let remaining = workingDays - 1;
  while (remaining > 0) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (!isWeekend(cursor)) remaining -= 1;
  }
  return formatISODate(cursor);
}

export function estimateEndDate(startISO: string, hours: number, developers: number): string {
  return addWorkingDays(startISO, requiredWorkingDays(hours, developers));
}

export function assertStartNotInPast(startISO: string, today = todayISO()): void {
  if (startISO < today) throw new Error('Start date cannot be in the past.');
  if (isWeekend(parseISODate(startISO))) {
    throw new Error('Start date must be a weekday (Monday–Friday).');
  }
}

export function scheduleSummary(hours: number, developers: number, startISO: string) {
  const capacity = dailyTeamCapacity(developers);
  const workingDays = requiredWorkingDays(hours, developers);
  const endDate = estimateEndDate(startISO, hours, developers);
  return {
    hours,
    developers,
    capacity,
    workingDays,
    startDate: startISO,
    endDate,
  };
}
