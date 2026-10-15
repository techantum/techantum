/**
 * Attendance, leave and payroll calculations.
 * Money is integer paise. Day fractions are integer thousandths of a day
 * so half-days stay exact and final amounts round once.
 */

export const DAY = 1000;

export const ATTENDANCE_CODES = ['P', 'PL', 'HD', 'UL', 'UHD'] as const;
export type AttendanceCode = (typeof ATTENDANCE_CODES)[number];
export type CalendarCode = AttendanceCode | 'WO' | 'HOL';

export type PayrollPolicy = {
  weeklyOff: number[];
  monthlyLeaveCredit: number;
  maxPaidLeavePerMonth: number;
  carryForward: boolean;
  halfDayValue: number;
  currency: string;
  approvalRequired: boolean;
  /** full = credit when employed on any day of the month. none = credit only for a complete calendar month. */
  joiningMonthCredit: 'full' | 'none';
  openingBalanceDefault: number;
  prorateRule: 'eligible_working_days';
  roundingMode: 'half_up_paise';
};

export const DEFAULT_POLICY: PayrollPolicy = {
  weeklyOff: [0, 6],
  monthlyLeaveCredit: 1,
  maxPaidLeavePerMonth: 5,
  carryForward: true,
  halfDayValue: 0.5,
  currency: 'INR',
  approvalRequired: true,
  joiningMonthCredit: 'full',
  openingBalanceDefault: 0,
  prorateRule: 'eligible_working_days',
  roundingMode: 'half_up_paise',
};

export type CalendarDay = {
  date: string;
  weekday: number;
  kind: 'working' | 'weekly_off' | 'holiday';
  holidayName: string | null;
};

export type LeaveResult = {
  opening: number;
  credit: number;
  adjustment: number;
  available: number;
  requestedPaid: number;
  allowedPaid: number;
  excessPaid: number;
  unpaid: number;
  closing: number;
  lop: number;
};

export type AttendanceTotals = {
  companyWorkingDays: number;
  eligibleWorkingDays: number;
  markedDays: number;
  pendingDays: number;
  presentDays: number;
  paidLeaveRequested: number;
  halfDays: number;
  unpaidLeave: number;
};

export type PayResult = {
  monthlyGrossCents: number;
  companyWorkingDays: number;
  eligibleWorkingDays: number;
  payableDays: number;
  lopDays: number;
  proratedGrossCents: number;
  lopDeductionCents: number;
  grossPayableCents: number;
  additionalCents: number;
  otherDeductionCents: number;
  professionalTaxCents: number;
  pfCents: number;
  netPayableCents: number;
  perDaySalaryCents: number;
};

export class PayrollCalcError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PayrollCalcError';
  }
}

export function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseIso(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new PayrollCalcError('Invalid date');
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function weekday(iso: string) {
  const { year, month, day } = parseIso(iso);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function units(days: number) {
  if (!Number.isFinite(days)) throw new PayrollCalcError('Invalid day value');
  return Math.round(days * DAY);
}

export function daysFromUnits(value: number) {
  return Math.round(value) / DAY;
}

const ZERO = BigInt(0);
const TWO = BigInt(2);

export function roundDiv(numerator: bigint, denominator: bigint) {
  if (denominator === ZERO) throw new PayrollCalcError('Cannot divide by zero working days');
  const negative = (numerator < ZERO) !== (denominator < ZERO);
  const left = numerator < ZERO ? -numerator : numerator;
  const right = denominator < ZERO ? -denominator : denominator;
  const rounded = (left + right / TWO) / right;
  const signed = negative ? -rounded : rounded;
  if (signed > BigInt(Number.MAX_SAFE_INTEGER) || signed < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new PayrollCalcError('Payroll amount is out of range');
  }
  return Number(signed);
}

const ATTENDANCE_ALIASES: Record<string, CalendarCode> = {
  PRESENT: 'P',
  CHECKIN: 'P',
  CHECKOUT: 'P',
  PAIDLEAVE: 'PL',
  LEAVE: 'PL',
  HALF: 'HD',
  HALFDAY: 'HD',
  HPL: 'HD',
  ABSENT: 'UL',
  LOP: 'UL',
  UNPAID: 'UL',
  UNPAIDLEAVE: 'UL',
  HUL: 'UHD',
  UNPAIDHALF: 'UHD',
  UNPAIDHALFDAY: 'UHD',
  WEEKLYOFF: 'WO',
  WEEKOFF: 'WO',
  HOLIDAY: 'HOL',
};

export function canonicalAttendance(value: unknown): CalendarCode | null {
  const code = String(value ?? '').trim().toUpperCase();
  if (!code || code === 'PENDING') return null;
  if (code === 'P' || code === 'PL' || code === 'HD' || code === 'UL' || code === 'UHD' || code === 'WO' || code === 'HOL') {
    return code;
  }
  return ATTENDANCE_ALIASES[code.replace(/[^A-Z0-9]/g, '')] || null;
}

/** Normalises a device payload. An explicit status wins. Punch times without a status mean present. */
export function mapBiometricEvent(event: { status?: unknown; punches?: unknown }): AttendanceCode | null {
  if (event.status != null && String(event.status).trim()) {
    const code = canonicalAttendance(event.status);
    if (!code || code === 'WO' || code === 'HOL') return null;
    return code;
  }
  return Array.isArray(event.punches) && event.punches.length > 0 ? 'P' : null;
}

export function buildMonth(
  year: number,
  month: number,
  holidays: { date: string; name: string }[],
  weeklyOff: number[]
): CalendarDay[] {
  const off = new Set(weeklyOff);
  const byDate = new Map(holidays.map((holiday) => [holiday.date.slice(0, 10), holiday.name]));
  const count = daysInMonth(year, month);
  const days: CalendarDay[] = [];
  for (let day = 1; day <= count; day += 1) {
    const date = isoDate(year, month, day);
    const week = weekday(date);
    const holidayName = byDate.get(date) || null;
    let kind: CalendarDay['kind'] = 'working';
    if (off.has(week)) kind = 'weekly_off';
    else if (holidayName) kind = 'holiday';
    days.push({ date, weekday: week, kind, holidayName });
  }
  return days;
}

export function employedOn(date: string, joining: string | null, lastWorking: string | null) {
  if (joining && date < joining) return false;
  if (lastWorking && date > lastWorking) return false;
  return true;
}

export function monthCreditUnits(policy: PayrollPolicy, employedAnyDay: boolean, employedWholeCalendarMonth: boolean) {
  if (!employedAnyDay) return 0;
  if (policy.joiningMonthCredit === 'none' && !employedWholeCalendarMonth) return 0;
  return units(policy.monthlyLeaveCredit);
}

export function calculateLeave(input: {
  opening: number;
  credit: number;
  adjustment: number;
  requestedPaid: number;
  unpaid: number;
  maxPaid: number;
  carryForward: boolean;
}): LeaveResult {
  const opening = units(input.opening);
  const credit = units(input.credit);
  const adjustment = units(input.adjustment);
  const requested = units(input.requestedPaid);
  const unpaid = units(input.unpaid);
  const maxPaid = units(input.maxPaid);
  const available = opening + credit + adjustment;
  if (available < 0) throw new PayrollCalcError('Leave balance cannot be negative');
  if (requested < 0 || unpaid < 0) throw new PayrollCalcError('Leave usage cannot be negative');
  const allowed = Math.min(requested, available, Math.max(0, maxPaid));
  const excess = requested - allowed;
  const closing = input.carryForward ? available - allowed : 0;
  return {
    opening: daysFromUnits(opening),
    credit: daysFromUnits(credit),
    adjustment: daysFromUnits(adjustment),
    available: daysFromUnits(available),
    requestedPaid: daysFromUnits(requested),
    allowedPaid: daysFromUnits(allowed),
    excessPaid: daysFromUnits(excess),
    unpaid: daysFromUnits(unpaid),
    closing: daysFromUnits(closing),
    lop: daysFromUnits(unpaid + excess),
  };
}

export function summariseAttendance(
  calendar: CalendarDay[],
  marks: Record<string, AttendanceCode | null | undefined>,
  joining: string | null,
  lastWorking: string | null,
  halfDayValue: number
): AttendanceTotals & { requestedPaid: number; worked: number; halfDayCount: number } {
  const companyWorkingDays = calendar.filter((day) => day.kind === 'working').length;
  let eligible = 0;
  let marked = 0;
  let presentUnits = 0;
  let requestedUnits = 0;
  let unpaidUnits = 0;
  let workedUnits = 0;
  let halfDayCount = 0;
  const half = units(halfDayValue);
  for (const day of calendar) {
    if (day.kind !== 'working') continue;
    if (!employedOn(day.date, joining, lastWorking)) continue;
    eligible += 1;
    const status = marks[day.date];
    if (!status) continue;
    marked += 1;
    if (status === 'P') {
      presentUnits += DAY;
      workedUnits += DAY;
    } else if (status === 'PL') {
      requestedUnits += DAY;
    } else if (status === 'HD') {
      presentUnits += DAY - half;
      workedUnits += DAY - half;
      requestedUnits += half;
      halfDayCount += 1;
    } else if (status === 'UL') {
      unpaidUnits += DAY;
    } else if (status === 'UHD') {
      presentUnits += half;
      workedUnits += half;
      unpaidUnits += DAY - half;
      halfDayCount += 1;
    }
  }
  return {
    companyWorkingDays,
    eligibleWorkingDays: eligible,
    markedDays: marked,
    pendingDays: eligible - marked,
    presentDays: daysFromUnits(presentUnits),
    paidLeaveRequested: daysFromUnits(requestedUnits),
    requestedPaid: daysFromUnits(requestedUnits),
    halfDays: halfDayCount,
    halfDayCount,
    unpaidLeave: daysFromUnits(unpaidUnits),
    worked: daysFromUnits(workedUnits),
  };
}

export function calculatePay(input: {
  monthlyGrossCents: number;
  companyWorkingDays: number;
  eligibleWorkingDays: number;
  workedDays: number;
  allowedPaidDays: number;
  lopDays: number;
  additionalCents?: number;
  otherDeductionCents?: number;
  professionalTaxCents?: number;
  pfCents?: number;
}): PayResult {
  const company = input.companyWorkingDays;
  if (!Number.isInteger(company) || company < 0) throw new PayrollCalcError('Working days are invalid');
  if (input.monthlyGrossCents < 0) throw new PayrollCalcError('Monthly gross salary cannot be negative');
  const eligibleUnits = units(input.eligibleWorkingDays);
  const payableUnits = units(input.workedDays) + units(input.allowedPaidDays);
  const lopUnits = units(input.lopDays);
  if (payableUnits < 0 || lopUnits < 0 || payableUnits + lopUnits > eligibleUnits) {
    throw new PayrollCalcError('Payable days are outside the eligible working days');
  }
  const additional = input.additionalCents || 0;
  const other = input.otherDeductionCents || 0;
  const tax = input.professionalTaxCents || 0;
  const pf = input.pfCents || 0;
  if (additional < 0 || other < 0 || tax < 0 || pf < 0) throw new PayrollCalcError('Deductions and earnings cannot be negative');

  const share = (dayUnits: number) => {
    if (company === 0) return 0;
    return roundDiv(BigInt(input.monthlyGrossCents) * BigInt(dayUnits), BigInt(company) * BigInt(DAY));
  };
  const prorated = share(eligibleUnits);
  const grossPayable = share(payableUnits);
  const lopDeduction = share(lopUnits);
  const net = grossPayable + additional - other - tax - pf;
  const perDay = company === 0 ? 0 : roundDiv(BigInt(input.monthlyGrossCents), BigInt(company));
  return {
    monthlyGrossCents: input.monthlyGrossCents,
    companyWorkingDays: company,
    eligibleWorkingDays: daysFromUnits(eligibleUnits),
    payableDays: daysFromUnits(payableUnits),
    lopDays: daysFromUnits(lopUnits),
    proratedGrossCents: prorated,
    lopDeductionCents: lopDeduction,
    grossPayableCents: grossPayable,
    additionalCents: additional,
    otherDeductionCents: other,
    professionalTaxCents: tax,
    pfCents: pf,
    netPayableCents: net,
    perDaySalaryCents: perDay,
  };
}

export function shiftMonth(year: number, month: number, delta: number) {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function monthOverlapsEmployment(year: number, month: number, joining: string | null, lastWorking: string | null) {
  const start = isoDate(year, month, 1);
  const end = isoDate(year, month, daysInMonth(year, month));
  if (joining && joining > end) return false;
  if (lastWorking && lastWorking < start) return false;
  return true;
}

export function employedEntireCalendarMonth(year: number, month: number, joining: string | null, lastWorking: string | null) {
  const start = isoDate(year, month, 1);
  const end = isoDate(year, month, daysInMonth(year, month));
  if (joining && joining > start) return false;
  if (lastWorking && lastWorking < end) return false;
  return true;
}
