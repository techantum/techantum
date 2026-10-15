import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { professionalTaxCents, salaryFromAnnualCtc } from '../finance/salary.ts';
import {
  buildMonth,
  calculateLeave,
  calculatePay,
  canonicalAttendance,
  daysInMonth,
  mapBiometricEvent,
  monthCreditUnits,
  summariseAttendance,
  DEFAULT_POLICY,
  type AttendanceCode,
} from './engine.ts';

function marks(entries: Record<string, AttendanceCode>) {
  return entries;
}

describe('attendance calendar', () => {
  it('excludes weekends and does not count a holiday that falls on a weekend twice', () => {
    const calendar = buildMonth(2026, 8, [{ date: '2026-08-15', name: 'Independence Day' }, { date: '2026-08-01', name: 'Weekend holiday' }], [0, 6]);
    assert.equal(daysInMonth(2026, 2), 28);
    assert.equal(daysInMonth(2024, 2), 29);
    assert.equal(calendar.length, 31);
    const saturday = calendar.find((day) => day.date === '2026-08-01');
    assert.equal(saturday?.kind, 'weekly_off');
    assert.equal(saturday?.holidayName, 'Weekend holiday');
    const holiday = calendar.find((day) => day.date === '2026-08-15');
    assert.equal(holiday?.weekday, 6);
    assert.equal(holiday?.kind, 'weekly_off');
    const working = calendar.filter((day) => day.kind === 'working');
    const weekend = calendar.filter((day) => day.kind === 'weekly_off');
    assert.equal(working.length + weekend.length, 31);
    assert.equal(working.some((day) => day.date === '2026-08-15'), false);
  });

  it('accepts workbook aliases and rejects unknown codes', () => {
    assert.equal(canonicalAttendance('hpl'), 'HD');
    assert.equal(canonicalAttendance('HUL'), 'UHD');
    assert.equal(canonicalAttendance('Present'), 'P');
    assert.equal(canonicalAttendance('Half Day'), 'HD');
    assert.equal(canonicalAttendance('Absent'), 'UL');
    assert.equal(mapBiometricEvent({ punches: [{ direction: 'in', time: '09:05' }] }), 'P');
    assert.equal(mapBiometricEvent({ status: 'Paid Leave', punches: [{ direction: 'in' }] }), 'PL');
    assert.equal(canonicalAttendance('HD'), 'HD');
    assert.equal(canonicalAttendance(''), null);
    assert.equal(canonicalAttendance('ABSENT'), 'UL');
    assert.equal(canonicalAttendance('NOPE'), null);
  });
});

describe('leave ledger', () => {
  it('credits one leave, carries unused leave, and caps monthly use at five', () => {
    const first = calculateLeave({
      opening: 0,
      credit: 1,
      adjustment: 0,
      requestedPaid: 0,
      unpaid: 0,
      maxPaid: 5,
      carryForward: true,
    });
    assert.equal(first.closing, 1);
    const second = calculateLeave({
      opening: first.closing,
      credit: 1,
      adjustment: 0,
      requestedPaid: 0,
      unpaid: 0,
      maxPaid: 5,
      carryForward: true,
    });
    assert.equal(second.available, 2);
    assert.equal(second.closing, 2);

    const capped = calculateLeave({
      opening: 5,
      credit: 1,
      adjustment: 0,
      requestedPaid: 6,
      unpaid: 0,
      maxPaid: 5,
      carryForward: true,
    });
    assert.equal(capped.available, 6);
    assert.equal(capped.allowedPaid, 5);
    assert.equal(capped.excessPaid, 1);
    assert.equal(capped.closing, 1);
    assert.equal(capped.lop, 1);
  });

  it('converts paid leave above the balance into LOP and keeps the balance at zero', () => {
    const result = calculateLeave({
      opening: 4,
      credit: 1,
      adjustment: 0,
      requestedPaid: 6,
      unpaid: 0,
      maxPaid: 5,
      carryForward: true,
    });
    assert.equal(result.available, 5);
    assert.equal(result.allowedPaid, 5);
    assert.equal(result.excessPaid, 1);
    assert.equal(result.closing, 0);
    assert.equal(result.lop, 1);

    const empty = calculateLeave({
      opening: 0,
      credit: 0,
      adjustment: 0,
      requestedPaid: 1,
      unpaid: 0,
      maxPaid: 5,
      carryForward: true,
    });
    assert.equal(empty.allowedPaid, 0);
    assert.equal(empty.lop, 1);
    assert.equal(empty.closing, 0);
  });

  it('consumes half a leave for one half-day and one leave for two half-days', () => {
    const one = calculateLeave({
      opening: 1,
      credit: 0,
      adjustment: 0,
      requestedPaid: 0.5,
      unpaid: 0,
      maxPaid: 5,
      carryForward: true,
    });
    assert.equal(one.allowedPaid, 0.5);
    assert.equal(one.closing, 0.5);
    assert.equal(one.lop, 0);
    const two = calculateLeave({
      opening: 1,
      credit: 0,
      adjustment: 0,
      requestedPaid: 1,
      unpaid: 0.5,
      maxPaid: 5,
      carryForward: true,
    });
    assert.equal(two.allowedPaid, 1);
    assert.equal(two.unpaid, 0.5);
    assert.equal(two.lop, 0.5);
    assert.equal(two.closing, 0);
  });

  it('credits a joining month only under the configured rule', () => {
    assert.equal(monthCreditUnits(DEFAULT_POLICY, true, false), 1000);
    assert.equal(monthCreditUnits({ ...DEFAULT_POLICY, joiningMonthCredit: 'none' }, true, false), 0);
    assert.equal(monthCreditUnits(DEFAULT_POLICY, false, false), 0);
  });
});

describe('salary calculation', () => {
  const gross = 3_000_000;

  it('pays the full monthly gross when every working day is present', () => {
    const pay = calculatePay({
      monthlyGrossCents: gross,
      companyWorkingDays: 22,
      eligibleWorkingDays: 22,
      workedDays: 22,
      allowedPaidDays: 0,
      lopDays: 0,
      professionalTaxCents: 20_000,
    });
    assert.equal(pay.lopDays, 0);
    assert.equal(pay.lopDeductionCents, 0);
    assert.equal(pay.grossPayableCents, gross);
    assert.equal(pay.payableDays, 22);
    assert.equal(pay.netPayableCents, gross - 20_000);
  });

  it('deducts one working day for unpaid leave and half a day for an unpaid half-day', () => {
    const full = calculatePay({
      monthlyGrossCents: gross,
      companyWorkingDays: 22,
      eligibleWorkingDays: 22,
      workedDays: 21,
      allowedPaidDays: 0,
      lopDays: 1,
    });
    assert.equal(full.lopDays, 1);
    assert.equal(full.lopDeductionCents, Math.round((gross * 1) / 22));
    assert.equal(full.grossPayableCents, gross - full.lopDeductionCents);
    assert.equal(full.payableDays, 21);

    const half = calculatePay({
      monthlyGrossCents: gross,
      companyWorkingDays: 22,
      eligibleWorkingDays: 22,
      workedDays: 21.5,
      allowedPaidDays: 0,
      lopDays: 0.5,
    });
    assert.equal(half.lopDays, 0.5);
    assert.equal(half.payableDays, 21.5);
    assert.equal(half.lopDeductionCents, Math.round((gross * 0.5) / 22));
  });

  it('does not reduce salary for paid leave inside the balance', () => {
    const pay = calculatePay({
      monthlyGrossCents: gross,
      companyWorkingDays: 22,
      eligibleWorkingDays: 22,
      workedDays: 20,
      allowedPaidDays: 2,
      lopDays: 0,
    });
    assert.equal(pay.lopDays, 0);
    assert.equal(pay.grossPayableCents, gross);
  });

  it('matches the worked example of two LOP days in a 22-day month', () => {
    const pay = calculatePay({
      monthlyGrossCents: gross,
      companyWorkingDays: 22,
      eligibleWorkingDays: 22,
      workedDays: 18,
      allowedPaidDays: 2,
      lopDays: 2,
    });
    assert.equal(pay.lopDays, 2);
    assert.equal(pay.payableDays, 20);
    assert.equal(pay.lopDeductionCents, Math.round((gross * 2) / 22));
    assert.equal(pay.grossPayableCents, gross - pay.lopDeductionCents);
  });

  it('prorates a mid-month joiner on eligible working days and uses the same denominator', () => {
    const pay = calculatePay({
      monthlyGrossCents: gross,
      companyWorkingDays: 22,
      eligibleWorkingDays: 11,
      workedDays: 10,
      allowedPaidDays: 0,
      lopDays: 1,
    });
    assert.equal(pay.proratedGrossCents, Math.round((gross * 11) / 22));
    assert.equal(pay.lopDays, 1);
    assert.equal(pay.payableDays, 10);
    assert.equal(pay.grossPayableCents, Math.round((gross * 10) / 22));
    assert.equal(pay.lopDeductionCents, Math.round(gross / 22));
  });

  it('applies statutory deductions once', () => {
    const structure = salaryFromAnnualCtc('360000');
    const tax = professionalTaxCents(structure.monthlyGrossCents);
    const pay = calculatePay({
      monthlyGrossCents: structure.monthlyGrossCents,
      companyWorkingDays: 22,
      eligibleWorkingDays: 22,
      workedDays: 22,
      allowedPaidDays: 0,
      lopDays: 0,
      professionalTaxCents: tax,
      pfCents: structure.pfCents,
    });
    assert.equal(pay.professionalTaxCents, 20_000);
    assert.equal(pay.netPayableCents, structure.monthlyGrossCents - 20_000);
  });

  it('keeps pending days out of both pay and loss of pay', () => {
    const calendar = buildMonth(2026, 10, [], [0, 6]);
    const working = calendar.filter((day) => day.kind === 'working');
    const entered: Record<string, AttendanceCode> = {};
    working.slice(0, working.length - 1).forEach((day) => {
      entered[day.date] = 'P';
    });
    const totals = summariseAttendance(calendar, marks(entered), null, null, 0.5);
    assert.equal(totals.pendingDays, 1);
    const pay = calculatePay({
      monthlyGrossCents: gross,
      companyWorkingDays: totals.companyWorkingDays,
      eligibleWorkingDays: totals.eligibleWorkingDays,
      workedDays: totals.worked,
      allowedPaidDays: 0,
      lopDays: 0,
    });
    assert.equal(pay.lopDays, 0);
    assert.equal(pay.lopDeductionCents, 0);
    assert.equal(pay.payableDays, totals.eligibleWorkingDays - 1);
    assert.ok(pay.grossPayableCents < gross);
  });

  it('returns a negative net instead of throwing when tax exceeds payable salary', () => {
    const pay = calculatePay({
      monthlyGrossCents: gross,
      companyWorkingDays: 20,
      eligibleWorkingDays: 20,
      workedDays: 0,
      allowedPaidDays: 0,
      lopDays: 0,
      professionalTaxCents: 20_000,
    });
    assert.equal(pay.grossPayableCents, 0);
    assert.equal(pay.netPayableCents, -20_000);
  });

  it('matches the August 2026 attendance sheet day counts', () => {
    const calendar = buildMonth(2026, 8, [{ date: '2026-08-10', name: 'Company Holiday' }], [0, 6]);
    const working = calendar.filter((day) => day.kind === 'working').map((day) => day.date);
    assert.equal(working.length, 20);
    assert.equal(working.includes('2026-08-10'), false);
    const unpaidBlock = new Set(['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14']);
    const patterns: Record<string, (date: string) => AttendanceCode> = {
      sudheer: (date) => (date === '2026-08-03' ? 'PL' : 'P'),
      gandham: (date) => (date === '2026-08-11' ? 'PL' : 'P'),
      lovely: (date) => (date === '2026-08-24' ? 'PL' : date >= '2026-08-25' && date <= '2026-08-28' ? 'UL' : 'P'),
      raj: () => 'P',
      valbhav: (date) => (unpaidBlock.has(date) ? 'UL' : 'P'),
      utkarsh: (date) => (unpaidBlock.has(date) ? 'UL' : 'P'),
      gowri: (date) => (unpaidBlock.has(date) ? 'UL' : 'P'),
    };
    const openings: Record<string, number> = { gandham: 3 };
    let lop = 0;
    for (const [name, pattern] of Object.entries(patterns)) {
      const entered: Record<string, AttendanceCode> = {};
      working.forEach((date) => {
        entered[date] = pattern(date);
      });
      const totals = summariseAttendance(calendar, marks(entered), '2026-08-01', null, 0.5);
      const leave = calculateLeave({
        opening: openings[name] || 0,
        credit: 1,
        adjustment: 0,
        requestedPaid: totals.requestedPaid,
        unpaid: totals.unpaidLeave,
        maxPaid: 5,
        carryForward: true,
      });
      lop += leave.lop;
      if (name === 'lovely') assert.equal(leave.lop, 4);
      if (name === 'valbhav') assert.equal(leave.lop, 9);
      if (name === 'gandham') assert.equal(leave.closing, 3);
      if (name === 'raj') assert.equal(leave.closing, 1);
    }
    assert.equal(lop, 31);
  });
});
