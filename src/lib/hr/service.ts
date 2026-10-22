import PDFDocument from 'pdfkit';
import { writeFinanceAudit } from '../finance/audit';
import { q, withFinanceTx, type DbClient } from '../finance/db';
import { FinanceConflictError, FinanceNotFoundError, FinanceValidationError } from '../finance/errors';
import { buildWorkbook } from '../finance/excel';
import { fromCents, toCents } from '../finance/money';
import { professionalTaxCents, salaryFromAnnualCtc } from '../finance/salary';
import {
  DEFAULT_POLICY,
  buildMonth,
  calculateLeave,
  calculatePay,
  canonicalAttendance,
  daysFromUnits,
  mapBiometricEvent,
  daysInMonth,
  employedEntireCalendarMonth,
  employedOn,
  isoDate,
  monthCreditUnits,
  monthOverlapsEmployment,
  shiftMonth,
  summariseAttendance,
  type AttendanceCode,
  type PayrollPolicy,
} from './engine';

type Employee = {
  id: string;
  employee_code: string;
  full_name: string;
  status: string;
  date_of_joining: string | null;
  last_working_date: string | null;
  annual_ctc: string | null;
  department: string | null;
  designation: string | null;
  employment_status: string | null;
};

type PolicyRecord = PayrollPolicy & { version: number };

const LOCKED = new Set(['approved', 'paid']);

function dayText(value: number) {
  return (Math.round(value * 1000) / 1000).toFixed(3);
}

function money(cents: number) {
  return fromCents(cents);
}

function num(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function businessToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

function requireMonth(year: number, month: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new FinanceValidationError('Payroll year is invalid');
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new FinanceValidationError('Payroll month is invalid');
}

function asPolicy(row: Record<string, unknown>): PolicyRecord {
  const credit = String(row.joining_month_credit) === 'none' ? 'none' : 'full';
  return {
    ...DEFAULT_POLICY,
    weeklyOff: Array.isArray(row.weekly_off) ? row.weekly_off.map(Number) : [0, 6],
    monthlyLeaveCredit: num(row.monthly_leave_credit),
    maxPaidLeavePerMonth: num(row.max_paid_leave_per_month),
    carryForward: Boolean(row.carry_forward),
    halfDayValue: num(row.half_day_value),
    currency: String(row.currency || 'INR'),
    approvalRequired: Boolean(row.approval_required),
    joiningMonthCredit: credit,
    openingBalanceDefault: num(row.opening_balance_default),
    version: num(row.version) || 1,
  };
}

async function readPolicy(client?: DbClient): Promise<PolicyRecord> {
  const { rows } = await q(client, 'SELECT * FROM hr_payroll_settings WHERE id = 1');
  if (!rows[0]) throw new FinanceNotFoundError('Payroll settings are not initialised');
  return asPolicy(rows[0]);
}

export async function getPayrollSettings() {
  return readPolicy();
}

export async function savePayrollSettings(body: Record<string, unknown>, userId: string) {
  const weeklyOff = Array.isArray(body.weekly_off)
    ? body.weekly_off.map(Number).filter((day) => day >= 0 && day <= 6)
    : String(body.weekly_off || '0,6')
        .split(',')
        .map((part) => Number(part.trim()))
        .filter((day) => day >= 0 && day <= 6);
  if (weeklyOff.length < 1) throw new FinanceValidationError('Choose at least one weekly off');
  const monthlyLeaveCredit = num(body.monthly_leave_credit);
  const maxPaid = num(body.max_paid_leave_per_month);
  const half = num(body.half_day_value);
  if (monthlyLeaveCredit < 0 || maxPaid < 0 || half <= 0 || half > 1) {
    throw new FinanceValidationError('Leave settings are out of range');
  }
  const joining = body.joining_month_credit === 'none' ? 'none' : 'full';
  return withFinanceTx(async (db) => {
    const current = await readPolicy(db);
    const { rows } = await q(
      db,
      `UPDATE hr_payroll_settings SET
         weekly_off=$1, monthly_leave_credit=$2, max_paid_leave_per_month=$3, carry_forward=$4,
         half_day_value=$5, currency=$6, approval_required=$7, joining_month_credit=$8,
         opening_balance_default=$9, version=version+1, updated_by=$10, updated_at=NOW()
       WHERE id=1 RETURNING *`,
      [
        weeklyOff,
        monthlyLeaveCredit,
        maxPaid,
        body.carry_forward !== false && body.carry_forward !== 'false',
        half,
        String(body.currency || 'INR').toUpperCase(),
        body.approval_required !== false && body.approval_required !== 'false',
        joining,
        num(body.opening_balance_default),
        userId,
      ]
    );
    const policy = asPolicy(rows[0]);
    await q(
      db,
      `INSERT INTO hr_payroll_settings_versions (version, settings, created_by) VALUES ($1,$2::jsonb,$3)`,
      [policy.version, JSON.stringify(policy), userId]
    );
    await writeFinanceAudit(db, {
      userId,
      action: 'Payroll Settings Updated',
      entityType: 'hr_settings',
      entityId: '1',
      previous: { version: current.version },
      next: { version: policy.version },
    });
    await recalculateUnlocked(db, userId);
    return policy;
  });
}

async function holidaysFor(client: DbClient | undefined, year: number, month?: number) {
  const start = isoDate(year, month || 1, 1);
  const end = isoDate(year, month || 12, daysInMonth(year, month || 12));
  const { rows } = await q(
    client,
    `SELECT id, holiday_date::text AS holiday_date, name, holiday_type, year
     FROM hr_holidays WHERE holiday_date BETWEEN $1 AND $2 ORDER BY holiday_date`,
    [start, end]
  );
  return rows as { id: string; holiday_date: string; name: string; holiday_type: string; year: number }[];
}

export async function listHolidays(year: number) {
  requireMonth(year, 1);
  return holidaysFor(undefined, year);
}

export async function saveHoliday(body: Record<string, unknown>, userId: string, id?: string) {
  const date = String(body.holiday_date || body.date || '').slice(0, 10);
  const name = String(body.name || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new FinanceValidationError('Holiday date is required');
  if (!name) throw new FinanceValidationError('Holiday name is required');
  const year = Number(date.slice(0, 4));
  const type = String(body.holiday_type || 'company').trim() || 'company';
  const { rows } = id
    ? await q(
        undefined,
        `UPDATE hr_holidays SET holiday_date=$2, name=$3, holiday_type=$4, year=$5, updated_by=$6, updated_at=NOW()
         WHERE id=$1 RETURNING id, holiday_date::text, name, holiday_type, year`,
        [id, date, name, type, year, userId]
      )
    : await q(
        undefined,
        `INSERT INTO hr_holidays (holiday_date, name, holiday_type, year, created_by, updated_by)
         VALUES ($1,$2,$3,$4,$5,$5)
         RETURNING id, holiday_date::text, name, holiday_type, year`,
        [date, name, type, year, userId]
      );
  if (!rows[0]) throw new FinanceNotFoundError('Holiday not found');
  await withFinanceTx(async (db) => recalculateUnlocked(db, userId));
  return rows[0];
}

export async function deleteHoliday(id: string, userId: string) {
  const { rows } = await q(undefined, 'DELETE FROM hr_holidays WHERE id=$1 RETURNING id', [id]);
  if (!rows[0]) throw new FinanceNotFoundError('Holiday not found');
  await withFinanceTx(async (db) => recalculateUnlocked(db, userId));
  return { ok: true };
}

async function loadEmployees(client?: DbClient) {
  const { rows } = await q(
    client,
    `SELECT id, employee_code, full_name, status, date_of_joining::text AS date_of_joining,
            last_working_date::text AS last_working_date, annual_ctc::text AS annual_ctc, department, designation,
            employment_status
     FROM finance_employees ORDER BY full_name`
  );
  return rows as Employee[];
}

function inMonth(employee: Employee, year: number, month: number) {
  if (!monthOverlapsEmployment(year, month, employee.date_of_joining, employee.last_working_date)) return false;
  if (employee.status === 'inactive' && !employee.last_working_date) return false;
  return true;
}

async function marksFor(client: DbClient | undefined, year: number, month: number, employeeId?: string) {
  const start = isoDate(year, month, 1);
  const end = isoDate(year, month, daysInMonth(year, month));
  const values: unknown[] = [start, end];
  let filter = '';
  if (employeeId) {
    values.push(employeeId);
    filter = ` AND employee_id = $${values.length}`;
  }
  const { rows } = await q(
    client,
    `SELECT employee_id, attendance_date::text AS attendance_date, status
     FROM hr_attendance WHERE attendance_date BETWEEN $1 AND $2${filter}`,
    values
  );
  const map = new Map<string, Record<string, AttendanceCode>>();
  for (const row of rows) {
    const code = canonicalAttendance(row.status);
    if (!code || code === 'WO' || code === 'HOL') continue;
    const bag = map.get(row.employee_id) || {};
    bag[row.attendance_date] = code;
    map.set(row.employee_id, bag);
  }
  return map;
}

async function adjustmentTotal(client: DbClient | undefined, employeeId: string, year: number, month: number) {
  const { rows } = await q<{ amount: string }>(
    client,
    `SELECT COALESCE(SUM(amount), 0)::text AS amount
     FROM hr_leave_adjustments WHERE employee_id=$1 AND payroll_year=$2 AND payroll_month=$3`,
    [employeeId, year, month]
  );
  return num(rows[0]?.amount);
}

async function ledgerRow(client: DbClient | undefined, employeeId: string, year: number, month: number) {
  const { rows } = await q(
    client,
    `SELECT * FROM hr_leave_ledger WHERE employee_id=$1 AND payroll_year=$2 AND payroll_month=$3`,
    [employeeId, year, month]
  );
  return rows[0] || null;
}

async function currentPayroll(client: DbClient | undefined, employeeId: string, year: number, month: number) {
  const { rows } = await q(
    client,
    `SELECT * FROM hr_monthly_payroll
     WHERE employee_id=$1 AND payroll_year=$2 AND payroll_month=$3 AND is_current`,
    [employeeId, year, month]
  );
  return rows[0] || null;
}

function emptyLeave() {
  return {
    opening: 0,
    credit: 0,
    adjustment: 0,
    available: 0,
    requestedPaid: 0,
    allowedPaid: 0,
    excessPaid: 0,
    unpaid: 0,
    closing: 0,
    lop: 0,
  };
}

function emptyTotals() {
  return {
    companyWorkingDays: 0,
    eligibleWorkingDays: 0,
    markedDays: 0,
    pendingDays: 0,
    presentDays: 0,
    paidLeaveRequested: 0,
    halfDays: 0,
    halfDayCount: 0,
    unpaidLeave: 0,
    worked: 0,
    requestedPaid: 0,
  };
}

function onLeavePolicy(employee: Employee) {
  return employee.employment_status !== 'probation' && employee.employment_status !== 'part_time';
}

function projectEmployee(
  employee: Employee,
  year: number,
  month: number,
  policy: PolicyRecord,
  calendar: ReturnType<typeof buildMonth>,
  marks: Record<string, AttendanceCode>,
  opening: number,
  adjustment: number
) {
  const totals = summariseAttendance(calendar, marks, employee.date_of_joining, employee.last_working_date, policy.halfDayValue);
  const eligible = onLeavePolicy(employee);
  const credit = eligible
    ? daysFromUnits(
        monthCreditUnits(
          policy,
          monthOverlapsEmployment(year, month, employee.date_of_joining, employee.last_working_date),
          employedEntireCalendarMonth(year, month, employee.date_of_joining, employee.last_working_date)
        )
      )
    : 0;
  const leave = calculateLeave({
    opening: eligible ? opening : 0,
    credit,
    adjustment: eligible ? adjustment : 0,
    requestedPaid: eligible ? totals.requestedPaid : 0,
    unpaid: eligible ? totals.unpaidLeave : totals.unpaidLeave + totals.requestedPaid,
    maxPaid: policy.maxPaidLeavePerMonth,
    carryForward: eligible && policy.carryForward,
  });
  let pay = null as ReturnType<typeof calculatePay> | null;
  let structure = null as ReturnType<typeof salaryFromAnnualCtc> | null;
  if (employee.annual_ctc && num(employee.annual_ctc) > 0 && totals.companyWorkingDays > 0) {
    try {
      structure = salaryFromAnnualCtc(employee.annual_ctc);
      const base = calculatePay({
        monthlyGrossCents: structure.monthlyGrossCents,
        companyWorkingDays: totals.companyWorkingDays,
        eligibleWorkingDays: totals.eligibleWorkingDays,
        workedDays: totals.worked,
        allowedPaidDays: leave.allowedPaid,
        lopDays: leave.lop,
      });
      const attendanceComplete = totals.pendingDays === 0;
      pay = calculatePay({
        monthlyGrossCents: structure.monthlyGrossCents,
        companyWorkingDays: totals.companyWorkingDays,
        eligibleWorkingDays: totals.eligibleWorkingDays,
        workedDays: totals.worked,
        allowedPaidDays: leave.allowedPaid,
        lopDays: leave.lop,
        professionalTaxCents: attendanceComplete ? professionalTaxCents(base.proratedGrossCents) : 0,
        pfCents: attendanceComplete && employee.employment_status !== 'part_time' ? structure.pfCents : 0,
      });
    } catch {
      pay = null;
    }
  }
  return { totals, leave, pay, structure };
}

async function openingFor(client: DbClient | undefined, employee: Employee, year: number, month: number, policy: PolicyRecord) {
  const previous = shiftMonth(year, month, -1);
  const prior = await ledgerRow(client, employee.id, previous.year, previous.month);
  if (prior) return { year, month, opening: num(prior.closing_balance) };
  const { rows } = await q(
    client,
    `SELECT balance, effective_year, effective_month FROM hr_leave_openings WHERE employee_id=$1`,
    [employee.id]
  );
  const configured = rows[0];
  if (!configured) return { year, month, opening: policy.openingBalanceDefault };
  const effectiveYear = Number(configured.effective_year);
  const effectiveMonth = Number(configured.effective_month);
  if (effectiveYear > year || (effectiveYear === year && effectiveMonth > month)) {
    return { year, month, opening: policy.openingBalanceDefault };
  }
  return { year: effectiveYear, month: effectiveMonth, opening: num(configured.balance) };
}

async function openingAt(employee: Employee, year: number, month: number, policy: PolicyRecord) {
  const start = await openingFor(undefined, employee, year, month, policy);
  let cursor = { year: start.year, month: start.month };
  let opening = start.opening;
  let guard = 0;
  while ((cursor.year !== year || cursor.month !== month) && guard < 36) {
    guard += 1;
    if (inMonth(employee, cursor.year, cursor.month)) {
      const holidays = await holidaysFor(undefined, cursor.year, cursor.month);
      const calendar = buildMonth(
        cursor.year,
        cursor.month,
        holidays.map((holiday) => ({ date: holiday.holiday_date, name: holiday.name })),
        policy.weeklyOff
      );
      const markMap = await marksFor(undefined, cursor.year, cursor.month, employee.id);
      const adjustment = await adjustmentTotal(undefined, employee.id, cursor.year, cursor.month);
      opening = projectEmployee(employee, cursor.year, cursor.month, policy, calendar, markMap.get(employee.id) || {}, opening, adjustment).leave.closing;
    }
    cursor = shiftMonth(cursor.year, cursor.month, 1);
  }
  return opening;
}

async function farMonth(client: DbClient, employeeId: string, year: number, month: number) {
  const { rows } = await q(
    client,
    `SELECT payroll_year, payroll_month FROM hr_monthly_payroll
     WHERE employee_id=$1 AND is_current AND status IN ('draft', 'attendance_pending', 'ready_for_approval')
     ORDER BY payroll_year DESC, payroll_month DESC LIMIT 1`,
    [employeeId]
  );
  if (!rows[0]) return { year, month };
  const latestYear = Number(rows[0].payroll_year);
  const latestMonth = Number(rows[0].payroll_month);
  if (latestYear > year || (latestYear === year && latestMonth > month)) return { year: latestYear, month: latestMonth };
  return { year, month };
}

async function persistMonth(
  client: DbClient,
  employee: Employee,
  year: number,
  month: number,
  policy: PolicyRecord,
  calendar: ReturnType<typeof buildMonth>,
  marks: Record<string, AttendanceCode>,
  opening: number,
  userId: string
) {
  const existing = await currentPayroll(client, employee.id, year, month);
  if (existing && LOCKED.has(String(existing.status))) {
    const ledger = await ledgerRow(client, employee.id, year, month);
    return num(ledger?.closing_balance);
  }
  const adjustment = await adjustmentTotal(client, employee.id, year, month);
  const projected = projectEmployee(employee, year, month, policy, calendar, marks, opening, adjustment);
  const preservedAdditional = existing ? toCents(existing.additional_earnings) : 0;
  const preservedOther = existing ? toCents(existing.other_deductions) : 0;
  let pay = projected.pay;
  if (pay && (preservedAdditional || preservedOther)) {
    pay = calculatePay({
      monthlyGrossCents: pay.monthlyGrossCents,
      companyWorkingDays: pay.companyWorkingDays,
      eligibleWorkingDays: pay.eligibleWorkingDays,
      workedDays: projected.totals.worked,
      allowedPaidDays: projected.leave.allowedPaid,
      lopDays: projected.leave.lop,
      additionalCents: preservedAdditional,
      otherDeductionCents: preservedOther,
      professionalTaxCents: pay.professionalTaxCents,
      pfCents: pay.pfCents,
    });
  }
  await q(
    client,
    `INSERT INTO hr_leave_ledger (
       employee_id, payroll_year, payroll_month, opening_balance, monthly_credit, adjustment,
       available_balance, requested_paid, allowed_paid, excess_paid, unpaid_leave, closing_balance,
       settings_version, status
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'draft')
     ON CONFLICT (employee_id, payroll_year, payroll_month) DO UPDATE SET
       opening_balance=EXCLUDED.opening_balance, monthly_credit=EXCLUDED.monthly_credit,
       adjustment=EXCLUDED.adjustment, available_balance=EXCLUDED.available_balance,
       requested_paid=EXCLUDED.requested_paid, allowed_paid=EXCLUDED.allowed_paid,
       excess_paid=EXCLUDED.excess_paid, unpaid_leave=EXCLUDED.unpaid_leave,
       closing_balance=EXCLUDED.closing_balance, settings_version=EXCLUDED.settings_version,
       status='draft', updated_at=NOW()
     WHERE hr_leave_ledger.status='draft'`,
    [
      employee.id,
      year,
      month,
      dayText(projected.leave.opening),
      dayText(projected.leave.credit),
      dayText(projected.leave.adjustment),
      dayText(projected.leave.available),
      dayText(projected.leave.requestedPaid),
      dayText(projected.leave.allowedPaid),
      dayText(projected.leave.excessPaid),
      dayText(projected.leave.unpaid),
      dayText(projected.leave.closing),
      policy.version,
    ]
  );
  if (pay) {
    const status = projected.totals.pendingDays > 0 ? 'attendance_pending' : 'ready_for_approval';
    const values = [
      money(pay.monthlyGrossCents),
      employee.annual_ctc,
      pay.companyWorkingDays,
      dayText(pay.eligibleWorkingDays),
      dayText(projected.totals.presentDays),
      dayText(projected.leave.allowedPaid),
      dayText(projected.leave.unpaid),
      projected.totals.halfDayCount,
      dayText(pay.lopDays),
      projected.totals.pendingDays,
      dayText(pay.payableDays),
      (pay.perDaySalaryCents / 100).toFixed(4),
      money(pay.proratedGrossCents),
      money(pay.lopDeductionCents),
      money(pay.grossPayableCents),
      money(pay.additionalCents),
      money(pay.otherDeductionCents),
      money(pay.professionalTaxCents),
      money(pay.pfCents),
      money(pay.netPayableCents),
      policy.version,
      status,
      userId,
    ];
    if (!existing) {
      await q(
        client,
        `INSERT INTO hr_monthly_payroll (
           employee_id, payroll_year, payroll_month, revision, monthly_gross, annual_ctc,
           company_working_days, eligible_working_days, present_days, paid_leave_days, unpaid_leave,
           half_days, lop_days, pending_days, payable_days, per_day_salary, prorated_gross, lop_deduction,
           gross_payable, additional_earnings, other_deductions, professional_tax, pf_amount, net_payable,
           settings_version, status, created_by, updated_by
         ) VALUES (
           $1,$2,$3,1,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$26
         )`,
        [employee.id, year, month, ...values]
      );
    } else {
      await q(
        client,
        `UPDATE hr_monthly_payroll SET
           monthly_gross=$2, annual_ctc=$3, company_working_days=$4, eligible_working_days=$5, present_days=$6,
           paid_leave_days=$7, unpaid_leave=$8, half_days=$9, lop_days=$10, pending_days=$11, payable_days=$12,
           per_day_salary=$13, prorated_gross=$14, lop_deduction=$15, gross_payable=$16, additional_earnings=$17,
           other_deductions=$18, professional_tax=$19, pf_amount=$20, net_payable=$21, settings_version=$22,
           status=$23, updated_by=$24, updated_at=NOW(), snapshot=NULL
         WHERE id=$1 AND status IN ('draft', 'attendance_pending', 'ready_for_approval')`,
        [existing.id, ...values]
      );
    }
  }
  return projected.leave.closing;
}

async function recalculateEmployee(client: DbClient, employee: Employee, year: number, month: number, userId: string) {
  const policy = await readPolicy(client);
  const start = await openingFor(client, employee, year, month, policy);
  const end = await farMonth(client, employee.id, year, month);
  let cursor = { year: start.year, month: start.month };
  let opening = start.opening;
  let guard = 0;
  while (guard < 36) {
    guard += 1;
    const holidays = await holidaysFor(client, cursor.year, cursor.month);
    const calendar = buildMonth(
      cursor.year,
      cursor.month,
      holidays.map((holiday) => ({ date: holiday.holiday_date, name: holiday.name })),
      policy.weeklyOff
    );
    const markMap = await marksFor(client, cursor.year, cursor.month, employee.id);
    if (inMonth(employee, cursor.year, cursor.month)) {
      opening = await persistMonth(
        client,
        employee,
        cursor.year,
        cursor.month,
        policy,
        calendar,
        markMap.get(employee.id) || {},
        opening,
        userId
      );
    }
    if (cursor.year === end.year && cursor.month === end.month) break;
    cursor = shiftMonth(cursor.year, cursor.month, 1);
    if (cursor.year > end.year || (cursor.year === end.year && cursor.month > end.month)) break;
  }
}

export async function syncEmployeeLeave(employeeId: string, userId: string) {
  const iso = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  await withFinanceTx(async (db) => {
    const employee = (await loadEmployees(db)).find((item) => item.id === employeeId);
    if (!employee) return;
    await recalculateEmployee(db, employee, year, month, userId);
  });
}

async function recalculateUnlocked(client: DbClient, userId: string) {
  const { rows } = await q(
    client,
    `SELECT DISTINCT employee_id, payroll_year, payroll_month FROM hr_monthly_payroll
     WHERE is_current AND status IN ('draft', 'attendance_pending', 'ready_for_approval')`
  );
  const employees = await loadEmployees(client);
  const byId = new Map(employees.map((employee) => [employee.id, employee]));
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.employee_id)) continue;
    seen.add(row.employee_id);
    const employee = byId.get(row.employee_id);
    if (!employee) continue;
    const earliest = rows
      .filter((item) => item.employee_id === row.employee_id)
      .sort((a, b) => a.payroll_year - b.payroll_year || a.payroll_month - b.payroll_month)[0];
    await recalculateEmployee(client, employee, Number(earliest.payroll_year), Number(earliest.payroll_month), userId);
  }
}

async function assertUnlocked(client: DbClient, employeeId: string, year: number, month: number) {
  const payroll = await currentPayroll(client, employeeId, year, month);
  if (payroll && LOCKED.has(String(payroll.status))) {
    throw new FinanceValidationError('This payroll month is approved. Create a revision before changing attendance or leave.');
  }
}

export async function getAttendance(year: number, month: number, query = '') {
  requireMonth(year, month);
  const policy = await readPolicy();
  const holidays = await holidaysFor(undefined, year, month);
  const calendar = buildMonth(
    year,
    month,
    holidays.map((holiday) => ({ date: holiday.holiday_date, name: holiday.name })),
    policy.weeklyOff
  );
  const employees = (await loadEmployees()).filter((employee) => inMonth(employee, year, month));
  const filtered = query
    ? employees.filter((employee) => `${employee.full_name} ${employee.employee_code} ${employee.department || ''} ${employee.designation || ''}`.toLowerCase().includes(query.toLowerCase()))
    : employees;
  const markMap = await marksFor(undefined, year, month);
  const payrolls = await q(
    undefined,
    `SELECT employee_id, status, pending_days, net_payable::text FROM hr_monthly_payroll
     WHERE payroll_year=$1 AND payroll_month=$2 AND is_current`,
    [year, month]
  );
  const payrollByEmployee = new Map(payrolls.rows.map((row) => [row.employee_id, row]));
  const rows = [];
  for (const employee of filtered) {
    try {
      const opening = await openingAt(employee, year, month, policy);
      const adjustment = await adjustmentTotal(undefined, employee.id, year, month);
      const projected = projectEmployee(employee, year, month, policy, calendar, markMap.get(employee.id) || {}, opening, adjustment);
      rows.push({
        id: employee.id,
        employee_code: employee.employee_code,
        full_name: employee.full_name,
        department: employee.department,
        designation: employee.designation,
        employment_status: employee.employment_status || 'regular',
        date_of_joining: employee.date_of_joining,
        last_working_date: employee.last_working_date,
        cells: markMap.get(employee.id) || {},
        totals: projected.totals,
        leave: projected.leave,
        pay: projected.pay
          ? {
              lopDays: projected.pay.lopDays,
              payableDays: projected.pay.payableDays,
              netPayable: money(projected.pay.netPayableCents),
              lopDeduction: money(projected.pay.lopDeductionCents),
            }
          : null,
        payroll_status: payrollByEmployee.get(employee.id)?.status || null,
        calculation_error: null as string | null,
      });
    } catch (err) {
      rows.push({
        id: employee.id,
        employee_code: employee.employee_code,
        full_name: employee.full_name,
        department: employee.department,
        designation: employee.designation,
        employment_status: employee.employment_status || 'regular',
        date_of_joining: employee.date_of_joining,
        last_working_date: employee.last_working_date,
        cells: markMap.get(employee.id) || {},
        totals: emptyTotals(),
        leave: emptyLeave(),
        pay: null,
        payroll_status: payrollByEmployee.get(employee.id)?.status || null,
        calculation_error: err instanceof Error ? err.message : 'Could not calculate this employee',
      });
    }
  }
  return {
    year,
    month,
    dates: calendar,
    holidays,
    employees: rows,
    pendingEmployees: rows.filter((row) => row.totals.pendingDays > 0).length,
  };
}

export async function saveAttendance(
  body: { updates?: { employee_id: string; date: string; status?: string | null }[]; overwrite?: boolean; reason?: string },
  userId: string
) {
  const updates = body.updates || [];
  if (!updates.length) throw new FinanceValidationError('Choose at least one attendance cell');
  const overwrite = Boolean(body.overwrite);
  const reason = String(body.reason || '').trim() || null;
  return withFinanceTx(async (db) => {
    const policy = await readPolicy(db);
    const employees = await loadEmployees(db);
    const byId = new Map(employees.map((employee) => [employee.id, employee]));
    const touched = new Map<string, { year: number; month: number }>();
    let saved = 0;
    let skipped = 0;
    for (const update of updates) {
      const employee = byId.get(update.employee_id);
      const date = String(update.date || '').slice(0, 10);
      if (!employee || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new FinanceValidationError('Attendance entry is invalid');
      const year = Number(date.slice(0, 4));
      const month = Number(date.slice(5, 7));
      await assertUnlocked(db, employee.id, year, month);
      const holidays = await holidaysFor(db, year, month);
      const calendar = buildMonth(
        year,
        month,
        holidays.map((holiday) => ({ date: holiday.holiday_date, name: holiday.name })),
        policy.weeklyOff
      );
      const day = calendar.find((item) => item.date === date);
      if (!day || day.kind !== 'working') throw new FinanceValidationError(`${date} is not a working day`);
      if (!employedOn(date, employee.date_of_joining, employee.last_working_date)) {
        throw new FinanceValidationError(`${employee.full_name} was not employed on ${date}`);
      }
      const next = update.status ? canonicalAttendance(update.status) : null;
      if (update.status && (!next || next === 'WO' || next === 'HOL')) throw new FinanceValidationError('Attendance status is invalid');
      const existing = await q(db, 'SELECT status FROM hr_attendance WHERE employee_id=$1 AND attendance_date=$2', [employee.id, date]);
      const previous = existing.rows[0]?.status || null;
      if (!overwrite && previous && previous !== next) {
        skipped += 1;
        continue;
      }
      if (previous === next || (!previous && !next)) continue;
      if (next) {
        await q(
          db,
          `INSERT INTO hr_attendance (employee_id, attendance_date, status, source, external_ref, created_by, updated_by)
           VALUES ($1,$2,$3,'manual',NULL,$4,$4)
           ON CONFLICT (employee_id, attendance_date) DO UPDATE SET
             status=$3, source='manual', external_ref=NULL, updated_by=$4, updated_at=NOW()`,
          [employee.id, date, next, userId]
        );
      } else {
        await q(db, 'DELETE FROM hr_attendance WHERE employee_id=$1 AND attendance_date=$2', [employee.id, date]);
      }
      await q(
        db,
        `INSERT INTO hr_attendance_audit (employee_id, attendance_date, previous_status, next_status, reason, changed_by)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [employee.id, date, previous, next, reason, userId]
      );
      saved += 1;
      const current = touched.get(employee.id);
      if (!current || year < current.year || (year === current.year && month < current.month)) {
        touched.set(employee.id, { year, month });
      }
    }
    for (const [employeeId, period] of touched) {
      const employee = byId.get(employeeId);
      if (employee) await recalculateEmployee(db, employee, period.year, period.month, userId);
    }
    return { saved, skipped };
  });
}

type AttendanceImportEntry = {
  external_ref?: string;
  employee_code?: string;
  date?: string;
  status?: string | null;
  punches?: unknown[];
};

export async function importAttendance(
  body: { source?: string; overwrite_manual?: boolean; entries?: AttendanceImportEntry[] },
  userId: string
) {
  const source = String(body.source || 'biometric').trim().toLowerCase();
  if (!/^[a-z][a-z0-9_-]{1,31}$/.test(source) || source === 'manual') {
    throw new FinanceValidationError('Attendance source must be a device or import name');
  }
  const entries = body.entries || [];
  if (!entries.length) throw new FinanceValidationError('Choose at least one attendance entry');
  if (entries.length > 5000) throw new FinanceValidationError('Import at most 5000 attendance entries at a time');
  const overwriteManual = Boolean(body.overwrite_manual);

  return withFinanceTx(async (db) => {
    const policy = await readPolicy(db);
    const employees = await loadEmployees(db);
    const byCode = new Map(employees.map((employee) => [employee.employee_code.toUpperCase(), employee]));
    const touched = new Map<string, { year: number; month: number }>();
    let saved = 0;
    let skipped = 0;
    const errors: { external_ref: string; message: string }[] = [];

    for (const entry of entries) {
      const externalRef = String(entry.external_ref || '').trim();
      const date = String(entry.date || '').slice(0, 10);
      const code = String(entry.employee_code || '').trim().toUpperCase();
      if (!externalRef || externalRef.length > 160 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !code) {
        errors.push({ external_ref: externalRef || code || date, message: 'Employee, date and external reference are required' });
        continue;
      }
      const employee = byCode.get(code);
      if (!employee) {
        errors.push({ external_ref: externalRef, message: `Employee ${code} was not found` });
        continue;
      }
      const next = mapBiometricEvent(entry);
      if (!next) {
        skipped += 1;
        await q(
          db,
          `INSERT INTO hr_attendance_imports (source, external_ref, employee_id, attendance_date, status, payload, applied, message)
           VALUES ($1,$2,$3,$4,NULL,$5::jsonb,FALSE,$6)
           ON CONFLICT (source, external_ref) DO UPDATE SET
             employee_id=$3, attendance_date=$4, status=NULL, payload=$5::jsonb, applied=FALSE, message=$6, created_at=NOW()`,
          [source, externalRef, employee.id, date, JSON.stringify(entry), 'No attendance status could be read']
        );
        continue;
      }
      const year = Number(date.slice(0, 4));
      const month = Number(date.slice(5, 7));
      try {
        await assertUnlocked(db, employee.id, year, month);
        const holidays = await holidaysFor(db, year, month);
        const calendar = buildMonth(
          year,
          month,
          holidays.map((holiday) => ({ date: holiday.holiday_date, name: holiday.name })),
          policy.weeklyOff
        );
        const day = calendar.find((item) => item.date === date);
        if (!day || day.kind !== 'working') throw new FinanceValidationError(`${date} is not a working day`);
        if (!employedOn(date, employee.date_of_joining, employee.last_working_date)) {
          throw new FinanceValidationError(`${employee.full_name} was not employed on ${date}`);
        }
        const dayRow = await q(
          db,
          `SELECT id, status, source, external_ref FROM hr_attendance WHERE employee_id=$1 AND attendance_date=$2`,
          [employee.id, date]
        );
        const current = dayRow.rows[0];
        if (current && current.source === 'manual' && !overwriteManual) {
          skipped += 1;
          await q(
            db,
            `INSERT INTO hr_attendance_imports (source, external_ref, employee_id, attendance_date, status, payload, applied, message)
             VALUES ($1,$2,$3,$4,$5,$6::jsonb,FALSE,$7)
             ON CONFLICT (source, external_ref) DO UPDATE SET
               employee_id=$3, attendance_date=$4, status=$5, payload=$6::jsonb, applied=FALSE, message=$7, created_at=NOW()`,
            [source, externalRef, employee.id, date, next, JSON.stringify(entry), 'Manual attendance was kept']
          );
          continue;
        }
        const refRow = await q(
          db,
          `SELECT id, employee_id, attendance_date::text FROM hr_attendance WHERE source=$1 AND external_ref=$2`,
          [source, externalRef]
        );
        const previousRef = refRow.rows[0];
        if (previousRef && previousRef.id !== current?.id) {
          if (previousRef.employee_id !== employee.id) throw new FinanceValidationError('This device reference belongs to another employee');
          const oldYear = Number(String(previousRef.attendance_date).slice(0, 4));
          const oldMonth = Number(String(previousRef.attendance_date).slice(5, 7));
          await assertUnlocked(db, employee.id, oldYear, oldMonth);
          await q(db, 'DELETE FROM hr_attendance WHERE id=$1', [previousRef.id]);
        }
        const previous = current?.status || null;
        await q(
          db,
          `INSERT INTO hr_attendance (employee_id, attendance_date, status, source, external_ref, created_by, updated_by)
           VALUES ($1,$2,$3,$4,$5,$6,$6)
           ON CONFLICT (employee_id, attendance_date) DO UPDATE SET
             status=$3, source=$4, external_ref=$5, updated_by=$6, updated_at=NOW()`,
          [employee.id, date, next, source, externalRef, userId]
        );
        if (previous !== next) {
          await q(
            db,
            `INSERT INTO hr_attendance_audit (employee_id, attendance_date, previous_status, next_status, reason, changed_by)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [employee.id, date, previous, next, `${source}:${externalRef}`, userId]
          );
        }
        await q(
          db,
          `INSERT INTO hr_attendance_imports (source, external_ref, employee_id, attendance_date, status, payload, applied, message)
           VALUES ($1,$2,$3,$4,$5,$6::jsonb,TRUE,NULL)
           ON CONFLICT (source, external_ref) DO UPDATE SET
             employee_id=$3, attendance_date=$4, status=$5, payload=$6::jsonb, applied=TRUE, message=NULL, created_at=NOW()`,
          [source, externalRef, employee.id, date, next, JSON.stringify(entry)]
        );
        saved += 1;
        const cursor = touched.get(employee.id);
        if (!cursor || year < cursor.year || (year === cursor.year && month < cursor.month)) {
          touched.set(employee.id, { year, month });
        }
      } catch (err) {
        errors.push({ external_ref: externalRef, message: err instanceof Error ? err.message : 'Could not import attendance' });
      }
    }

    for (const [employeeId, period] of touched) {
      const employee = employees.find((item) => item.id === employeeId);
      if (employee) await recalculateEmployee(db, employee, period.year, period.month, userId);
    }
    return { source, saved, skipped, errors };
  });
}

export async function attendanceHistory(employeeId: string, year: number, month: number) {
  requireMonth(year, month);
  const start = isoDate(year, month, 1);
  const end = isoDate(year, month, daysInMonth(year, month));
  const { rows } = await q(
    undefined,
    `SELECT attendance_date::text, previous_status, next_status, reason, changed_at
     FROM hr_attendance_audit
     WHERE employee_id=$1 AND attendance_date BETWEEN $2 AND $3
     ORDER BY changed_at DESC LIMIT 100`,
    [employeeId, start, end]
  );
  return rows;
}

export async function listLeave(year: number, month: number, query = '') {
  requireMonth(year, month);
  const board = await getAttendance(year, month, query);
  return {
    year,
    month,
    rows: board.employees.map((employee) => ({
      id: employee.id,
      employee_code: employee.employee_code,
      full_name: employee.full_name,
      department: employee.department,
      employment_status: employee.employment_status || 'regular',
      ...employee.leave,
      pendingDays: employee.totals.pendingDays,
      payroll_status: employee.payroll_status,
      calculation_error: employee.calculation_error,
    })),
  };
}

export async function listLeaveAdjustments(year: number) {
  requireMonth(year, 1);
  const { rows } = await q(
    undefined,
    `SELECT a.id, a.employee_id, a.payroll_year, a.payroll_month, a.amount::text AS amount, a.reason, a.created_at,
            e.full_name, e.employee_code
     FROM hr_leave_adjustments a
     JOIN finance_employees e ON e.id = a.employee_id
     WHERE a.payroll_year = $1
     ORDER BY a.created_at DESC
     LIMIT 100`,
    [year]
  );
  return rows;
}

export async function employeeLeaveHistory(employeeId: string, year: number) {
  requireMonth(year, 1);
  if (!employeeId) throw new FinanceValidationError('Employee is required');
  const months = [];
  for (let month = 1; month <= 12; month += 1) {
    const board = await listLeave(year, month);
    const row = board.rows.find((item) => item.id === employeeId);
    if (row) months.push({ month, ...row });
  }
  return months;
}

export async function addLeaveAdjustment(body: Record<string, unknown>, userId: string) {
  const employeeId = String(body.employee_id || '');
  const year = Number(body.payroll_year || body.year);
  const month = Number(body.payroll_month || body.month);
  const amount = num(body.amount);
  const reason = String(body.reason || '').trim();
  requireMonth(year, month);
  if (!employeeId) throw new FinanceValidationError('Employee is required');
  if (!reason) throw new FinanceValidationError('A reason is required for a leave adjustment');
  if (!amount) throw new FinanceValidationError('Adjustment amount is required');
  return withFinanceTx(async (db) => {
    const employees = await loadEmployees(db);
    const employee = employees.find((item) => item.id === employeeId);
    if (!employee) throw new FinanceNotFoundError('Employee not found');
    if (!onLeavePolicy(employee)) throw new FinanceValidationError('Paid leave applies only to regular employees. Probation and part-time employees are outside the leave policy.');
    await assertUnlocked(db, employeeId, year, month);
    await q(
      db,
      `INSERT INTO hr_leave_adjustments (employee_id, payroll_year, payroll_month, amount, reason, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [employeeId, year, month, amount, reason, userId]
    );
    await recalculateEmployee(db, employee, year, month, userId);
    await writeFinanceAudit(db, {
      userId,
      action: 'Leave Adjusted',
      entityType: 'hr_leave',
      entityId: employeeId,
      next: { year, month, amount, reason },
    });
    return { ok: true };
  });
}

export async function setLeaveOpening(body: Record<string, unknown>, userId: string) {
  const employeeId = String(body.employee_id || '');
  const year = Number(body.effective_year || body.year);
  const month = Number(body.effective_month || body.month);
  const balance = num(body.balance);
  const note = String(body.note || '').trim() || null;
  requireMonth(year, month);
  if (!employeeId) throw new FinanceValidationError('Employee is required');
  const person = (await loadEmployees()).find((item) => item.id === employeeId);
  if (person && !onLeavePolicy(person)) throw new FinanceValidationError('Opening leave applies only to regular employees.');
  if (balance < 0) throw new FinanceValidationError('Opening leave cannot be negative');
  const existing = await q(undefined, 'SELECT id FROM hr_leave_ledger WHERE employee_id=$1 LIMIT 1', [employeeId]);
  if (existing.rows[0]) {
    throw new FinanceValidationError('This employee already has a leave ledger. Post an adjustment instead of changing the opening balance.');
  }
  await q(
    undefined,
    `INSERT INTO hr_leave_openings (employee_id, balance, effective_year, effective_month, note, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (employee_id) DO UPDATE SET balance=$2, effective_year=$3, effective_month=$4, note=$5, updated_by=$6, updated_at=NOW()`,
    [employeeId, balance, year, month, note, userId]
  );
  return { ok: true };
}

export async function generatePayroll(year: number, month: number, userId: string) {
  requireMonth(year, month);
  return withFinanceTx(async (db) => {
    const employees = (await loadEmployees(db)).filter((employee) => inMonth(employee, year, month));
    const warnings: string[] = [];
    for (const employee of employees) {
      if (!employee.annual_ctc || num(employee.annual_ctc) <= 0) {
        warnings.push(`${employee.full_name} has no annual CTC, so payroll was not created.`);
        continue;
      }
      await recalculateEmployee(db, employee, year, month, userId);
    }
    return { ...(await payrollRows(db, year, month, '')), warnings };
  });
}

async function payrollRows(client: DbClient | undefined, year: number, month: number, query: string, status = '') {
  const values: unknown[] = [year, month];
  const where = ['p.payroll_year=$1', 'p.payroll_month=$2', 'p.is_current'];
  if (query) {
    values.push(`%${query}%`);
    where.push(`(e.full_name ILIKE $${values.length} OR e.employee_code ILIKE $${values.length})`);
  }
  if (status) {
    values.push(status);
    where.push(`p.status = $${values.length}`);
  }
  const { rows } = await q(
    client,
    `SELECT p.*, e.full_name, e.employee_code, e.department,
            COALESCE(p.payslip_id, s.id) AS payslip_id
     FROM hr_monthly_payroll p
     JOIN finance_employees e ON e.id = p.employee_id
     LEFT JOIN finance_employee_payslips s
       ON s.employee_id = p.employee_id
      AND s.payroll_year = p.payroll_year
      AND s.payroll_month = p.payroll_month
     WHERE ${where.join(' AND ')}
     ORDER BY e.full_name`,
    values
  );
  const totals = rows.reduce(
    (sum, row) => {
      sum.gross += toCents(row.monthly_gross);
      sum.lopDays += num(row.lop_days);
      sum.lop += toCents(row.lop_deduction);
      sum.net += toCents(row.net_payable);
      if (row.status === 'attendance_pending' || row.status === 'ready_for_approval' || row.status === 'draft') sum.pending += 1;
      if (row.status === 'approved' || row.status === 'paid') sum.approved += 1;
      return sum;
    },
    { gross: 0, lopDays: 0, lop: 0, net: 0, pending: 0, approved: 0 }
  );
  return {
    year,
    month,
    rows,
    summary: {
      employees: rows.length,
      gross: money(totals.gross),
      lopDays: Math.round(totals.lopDays * 1000) / 1000,
      lopDeduction: money(totals.lop),
      net: money(totals.net),
      pendingApprovals: totals.pending,
      approved: totals.approved,
    },
  };
}

export async function listPayroll(year: number, month: number, query = '', status = '') {
  requireMonth(year, month);
  return payrollRows(undefined, year, month, query, status);
}

export async function getPayroll(id: string) {
  const { rows } = await q(
    undefined,
    `SELECT p.*, e.full_name, e.employee_code, e.department, e.designation
     FROM hr_monthly_payroll p JOIN finance_employees e ON e.id = p.employee_id WHERE p.id=$1`,
    [id]
  );
  if (!rows[0]) throw new FinanceNotFoundError('Payroll record not found');
  const events = await q(undefined, 'SELECT from_status, to_status, note, created_at FROM hr_payroll_events WHERE payroll_id=$1 ORDER BY created_at', [
    id,
  ]);
  const ledger = await ledgerRow(undefined, rows[0].employee_id, Number(rows[0].payroll_year), Number(rows[0].payroll_month));
  return { payroll: rows[0], events: events.rows, leave: ledger };
}

async function snapshotFor(client: DbClient, payroll: Record<string, unknown>, policy: PolicyRecord) {
  const year = Number(payroll.payroll_year);
  const month = Number(payroll.payroll_month);
  const holidays = await holidaysFor(client, year, month);
  const marks = await marksFor(client, year, month, String(payroll.employee_id));
  const ledger = await ledgerRow(client, String(payroll.employee_id), year, month);
  return {
    policyVersion: policy.version,
    policy,
    holidays: holidays.map((holiday) => ({ date: holiday.holiday_date, name: holiday.name })),
    attendance: marks.get(String(payroll.employee_id)) || {},
    leave: ledger,
    amounts: {
      monthlyGross: payroll.monthly_gross,
      lopDeduction: payroll.lop_deduction,
      netPayable: payroll.net_payable,
      professionalTax: payroll.professional_tax,
      pf: payroll.pf_amount,
    },
    capturedAt: new Date().toISOString(),
  };
}

export async function approvePayroll(ids: string[], userId: string) {
  if (!ids.length) throw new FinanceValidationError('Select a payroll record to approve');
  return withFinanceTx(async (db) => {
    const policy = await readPolicy(db);
    const approved: string[] = [];
    for (const id of ids) {
      const { rows } = await q(db, 'SELECT * FROM hr_monthly_payroll WHERE id=$1 AND is_current FOR UPDATE', [id]);
      const payroll = rows[0];
      if (!payroll) throw new FinanceNotFoundError('Payroll record not found');
      if (payroll.status === 'approved' || payroll.status === 'paid') throw new FinanceConflictError('Payroll is already approved');
      if (Number(payroll.pending_days) > 0 || payroll.status !== 'ready_for_approval') {
        throw new FinanceValidationError('Complete pending attendance before approving payroll');
      }
      if (toCents(payroll.net_payable) < 0) {
        throw new FinanceValidationError('Net payable salary cannot be negative');
      }
      const snapshot = await snapshotFor(db, payroll, policy);
      await q(
        db,
        `UPDATE hr_monthly_payroll SET status='approved', snapshot=$2::jsonb, approved_by=$3, approved_at=NOW(), updated_by=$3
         WHERE id=$1`,
        [id, JSON.stringify(snapshot), userId]
      );
      await q(
        db,
        `UPDATE hr_leave_ledger SET status='locked' WHERE employee_id=$1 AND payroll_year=$2 AND payroll_month=$3`,
        [payroll.employee_id, payroll.payroll_year, payroll.payroll_month]
      );
      await q(db, `INSERT INTO hr_payroll_events (payroll_id, from_status, to_status, actor_id) VALUES ($1,$2,'approved',$3)`, [
        id,
        payroll.status,
        userId,
      ]);
      await writeFinanceAudit(db, {
        userId,
        action: 'Payroll Approved',
        entityType: 'hr_payroll',
        entityId: id,
        next: { status: 'approved', revision: payroll.revision },
      });
      approved.push(id);
    }
    return { approved };
  });
}

export async function markPayrollPaid(ids: string[], userId: string) {
  if (!ids.length) throw new FinanceValidationError('Select a payroll record');
  return withFinanceTx(async (db) => {
    for (const id of ids) {
      const { rows } = await q(db, 'SELECT status FROM hr_monthly_payroll WHERE id=$1 AND is_current FOR UPDATE', [id]);
      if (!rows[0]) throw new FinanceNotFoundError('Payroll record not found');
      if (rows[0].status !== 'approved') throw new FinanceValidationError('Only approved payroll can be marked paid');
      await q(db, `UPDATE hr_monthly_payroll SET status='paid', paid_by=$2, paid_at=NOW(), updated_by=$2 WHERE id=$1`, [id, userId]);
      await q(db, `INSERT INTO hr_payroll_events (payroll_id, from_status, to_status, actor_id) VALUES ($1,'approved','paid',$2)`, [
        id,
        userId,
      ]);
    }
    return { paid: ids };
  });
}

export async function revisePayroll(id: string, reason: string, userId: string) {
  const note = reason.trim();
  if (!note) throw new FinanceValidationError('A revision reason is required');
  return withFinanceTx(async (db) => {
    const { rows } = await q(db, 'SELECT * FROM hr_monthly_payroll WHERE id=$1 AND is_current FOR UPDATE', [id]);
    const payroll = rows[0];
    if (!payroll) throw new FinanceNotFoundError('Payroll record not found');
    if (!LOCKED.has(String(payroll.status))) throw new FinanceValidationError('Only approved payroll can be revised');
    await q(db, 'UPDATE hr_monthly_payroll SET is_current=FALSE, updated_by=$2 WHERE id=$1', [id, userId]);
    const inserted = await q(
      db,
      `INSERT INTO hr_monthly_payroll (
         employee_id, payroll_year, payroll_month, revision, status, monthly_gross, annual_ctc,
         company_working_days, eligible_working_days, present_days, paid_leave_days, unpaid_leave,
         half_days, lop_days, pending_days, payable_days, per_day_salary, prorated_gross, lop_deduction,
         gross_payable, additional_earnings, other_deductions, professional_tax, pf_amount, net_payable,
         settings_version, revision_reason, created_by, updated_by
       ) VALUES (
         $1,$2,$3,$4,'draft',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$27
       ) RETURNING id`,
      [
        payroll.employee_id,
        payroll.payroll_year,
        payroll.payroll_month,
        Number(payroll.revision) + 1,
        payroll.monthly_gross,
        payroll.annual_ctc,
        payroll.company_working_days,
        payroll.eligible_working_days,
        payroll.present_days,
        payroll.paid_leave_days,
        payroll.unpaid_leave,
        payroll.half_days,
        payroll.lop_days,
        payroll.pending_days,
        payroll.payable_days,
        payroll.per_day_salary,
        payroll.prorated_gross,
        payroll.lop_deduction,
        payroll.gross_payable,
        payroll.additional_earnings,
        payroll.other_deductions,
        payroll.professional_tax,
        payroll.pf_amount,
        payroll.net_payable,
        payroll.settings_version,
        note,
        userId,
      ]
    );
    await q(db, `UPDATE hr_leave_ledger SET status='draft' WHERE employee_id=$1 AND payroll_year=$2 AND payroll_month=$3`, [
      payroll.employee_id,
      payroll.payroll_year,
      payroll.payroll_month,
    ]);
    await q(db, `INSERT INTO hr_payroll_events (payroll_id, from_status, to_status, note, actor_id) VALUES ($1,$2,'draft',$3,$4)`, [
      inserted.rows[0].id,
      payroll.status,
      note,
      userId,
    ]);
    const employees = await loadEmployees(db);
    const employee = employees.find((item) => item.id === payroll.employee_id);
    if (!employee) throw new FinanceNotFoundError('Employee not found');
    await recalculateEmployee(db, employee, Number(payroll.payroll_year), Number(payroll.payroll_month), userId);
    return { id: inserted.rows[0].id };
  });
}

export async function updatePayrollExtras(id: string, body: Record<string, unknown>, userId: string) {
  const additional = toCents(body.additional_earnings ?? 0);
  const other = toCents(body.other_deductions ?? 0);
  if (additional < 0 || other < 0) throw new FinanceValidationError('Amounts cannot be negative');
  return withFinanceTx(async (db) => {
    const { rows } = await q(db, 'SELECT * FROM hr_monthly_payroll WHERE id=$1 AND is_current FOR UPDATE', [id]);
    const payroll = rows[0];
    if (!payroll) throw new FinanceNotFoundError('Payroll record not found');
    if (LOCKED.has(String(payroll.status))) throw new FinanceValidationError('Approved payroll is locked');
    await q(db, 'UPDATE hr_monthly_payroll SET additional_earnings=$2, other_deductions=$3 WHERE id=$1', [
      id,
      money(additional),
      money(other),
    ]);
    const employees = await loadEmployees(db);
    const employee = employees.find((item) => item.id === payroll.employee_id);
    if (!employee) throw new FinanceNotFoundError('Employee not found');
    await recalculateEmployee(db, employee, Number(payroll.payroll_year), Number(payroll.payroll_month), userId);
    return { ok: true };
  });
}

export async function hrDashboard() {
  const today = businessToday();
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const policy = await readPolicy();
  const holidays = await holidaysFor(undefined, year, month);
  const calendar = buildMonth(
    year,
    month,
    holidays.map((holiday) => ({ date: holiday.holiday_date, name: holiday.name })),
    policy.weeklyOff
  );
  const todayInfo = calendar.find((day) => day.date === today);
  const employees = (await loadEmployees()).filter((employee) => employee.status === 'active');
  const employedToday = employees.filter((employee) => employedOn(today, employee.date_of_joining, employee.last_working_date));
  const marks = await q(undefined, 'SELECT employee_id, status FROM hr_attendance WHERE attendance_date=$1', [today]);
  const byEmployee = new Map(marks.rows.map((row) => [row.employee_id, row.status]));
  let present = 0;
  let onLeave = 0;
  let pending = 0;
  const workingToday = todayInfo?.kind === 'working';
  for (const employee of employedToday) {
    const status = byEmployee.get(employee.id);
    if (status === 'P') present += 1;
    else if (status === 'PL' || status === 'HD' || status === 'UL' || status === 'UHD') onLeave += 1;
    else if (workingToday) pending += 1;
  }
  const leave = await q<{ balance: string }>(
    undefined,
    `SELECT COALESCE(SUM(closing_balance), 0)::text AS balance FROM hr_leave_ledger WHERE payroll_year=$1 AND payroll_month=$2`,
    [year, month]
  );
  const payroll = await payrollRows(undefined, year, month, '');
  return {
    today,
    activeEmployees: employees.length,
    presentToday: present,
    onLeaveToday: onLeave,
    attendancePending: pending,
    availablePaidLeave: num(leave.rows[0]?.balance),
    grossPayroll: payroll.summary.gross,
    lopDeduction: payroll.summary.lopDeduction,
    netPayroll: payroll.summary.net,
  };
}

export async function annualSummary(year: number, employeeId = '') {
  requireMonth(year, 1);
  const policy = await readPolicy();
  const companyMonths = [];
  for (let month = 1; month <= 12; month += 1) {
    const holidays = await holidaysFor(undefined, year, month);
    const calendar = buildMonth(
      year,
      month,
      holidays.map((holiday) => ({ date: holiday.holiday_date, name: holiday.name })),
      policy.weeklyOff
    );
    companyMonths.push({
      month,
      workingDays: calendar.filter((day) => day.kind === 'working').length,
      weeklyOff: calendar.filter((day) => day.kind === 'weekly_off').length,
      holidays: calendar.filter((day) => day.kind === 'holiday').length,
    });
  }
  const values: unknown[] = [year];
  let employeeFilter = '';
  if (employeeId) {
    values.push(employeeId);
    employeeFilter = ` AND p.employee_id = $${values.length}`;
  }
  const { rows } = await q(
    undefined,
    `SELECT p.*, e.full_name, e.employee_code
     FROM hr_monthly_payroll p
     JOIN finance_employees e ON e.id = p.employee_id
     WHERE p.payroll_year=$1 AND p.is_current${employeeFilter}
     ORDER BY e.full_name, p.payroll_month`,
    values
  );
  const ledgers = await q(
    undefined,
    `SELECT l.*, e.full_name, e.employee_code FROM hr_leave_ledger l
     JOIN finance_employees e ON e.id = l.employee_id
     WHERE l.payroll_year=$1 ${employeeId ? 'AND l.employee_id=$2' : ''}
     ORDER BY e.full_name, l.payroll_month`,
    employeeId ? [year, employeeId] : [year]
  );
  return { year, companyMonths, payroll: rows, leave: ledgers.rows };
}

export async function payrollExport(year: number, month: number) {
  const data = await listPayroll(year, month);
  return buildWorkbook([
    {
      name: 'Payroll',
      columns: [
        { header: 'Employee', key: 'name', width: 28 },
        { header: 'ID', key: 'code', width: 14 },
        { header: 'Gross', key: 'gross', width: 14 },
        { header: 'Working days', key: 'working', width: 14 },
        { header: 'Present', key: 'present', width: 12 },
        { header: 'Paid leave', key: 'paid', width: 12 },
        { header: 'LOP days', key: 'lop', width: 12 },
        { header: 'Payable days', key: 'payable', width: 14 },
        { header: 'LOP deduction', key: 'deduction', width: 16 },
        { header: 'Net payable', key: 'net', width: 16 },
        { header: 'Status', key: 'status', width: 22 },
      ],
      rows: data.rows.map((row) => ({
        name: row.full_name,
        code: row.employee_code,
        gross: row.monthly_gross,
        working: row.company_working_days,
        present: row.present_days,
        paid: row.paid_leave_days,
        lop: row.lop_days,
        payable: row.payable_days,
        deduction: row.lop_deduction,
        net: row.net_payable,
        status: row.status,
      })),
    },
  ]);
}

export async function annualExport(year: number) {
  const data = await annualSummary(year);
  return buildWorkbook([
    {
      name: 'Company calendar',
      columns: [
        { header: 'Month', key: 'month' },
        { header: 'Working days', key: 'workingDays' },
        { header: 'Weekly off', key: 'weeklyOff' },
        { header: 'Holidays on working days', key: 'holidays' },
      ],
      rows: data.companyMonths,
    },
    {
      name: 'Payroll',
      columns: [
        { header: 'Employee', key: 'name', width: 28 },
        { header: 'Month', key: 'month' },
        { header: 'Gross', key: 'gross' },
        { header: 'Net', key: 'net' },
        { header: 'Working days', key: 'working' },
        { header: 'Paid leave', key: 'paid' },
        { header: 'Unpaid leave', key: 'unpaid' },
        { header: 'LOP deduction', key: 'lop' },
        { header: 'Status', key: 'status' },
      ],
      rows: data.payroll.map((row) => ({
        name: row.full_name,
        month: row.payroll_month,
        gross: row.monthly_gross,
        net: row.net_payable,
        working: row.eligible_working_days,
        paid: row.paid_leave_days,
        unpaid: row.unpaid_leave,
        lop: row.lop_deduction,
        status: row.status,
      })),
    },
    {
      name: 'Leave',
      columns: [
        { header: 'Employee', key: 'name', width: 28 },
        { header: 'Month', key: 'month' },
        { header: 'Opening', key: 'opening' },
        { header: 'Credit', key: 'credit' },
        { header: 'Used', key: 'used' },
        { header: 'Closing', key: 'closing' },
      ],
      rows: data.leave.map((row) => ({
        name: row.full_name,
        month: row.payroll_month,
        opening: row.opening_balance,
        credit: row.monthly_credit,
        used: row.allowed_paid,
        closing: row.closing_balance,
      })),
    },
  ]);
}

export async function annualPdf(year: number) {
  const data = await annualSummary(year);
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.fontSize(14).text(`Techantum annual payroll ${year}`);
    doc.moveDown(0.4);
    doc.fontSize(9).text('Company calendar working days are not added across employees.');
    data.companyMonths.forEach((month) => {
      doc.text(`Month ${month.month}: working ${month.workingDays}, weekly off ${month.weeklyOff}, holidays ${month.holidays}`);
    });
    doc.moveDown(0.4);
    data.payroll.forEach((row) => {
      doc.text(
        `${row.full_name} | month ${row.payroll_month} | gross ${row.monthly_gross} | net ${row.net_payable} | paid leave ${row.paid_leave_days} | LOP ${row.lop_days} | ${row.status}`
      );
    });
    doc.end();
  });
}
