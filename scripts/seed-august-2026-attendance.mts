/**
 * Loads the August 2026 attendance sheet into HR.
 * Existing annual CTC values are left unchanged.
 * Monthly salaries for employees who are not already in the directory
 * are taken from the salary sheet: 25300, 30000, 30000, 20000 and 15000.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildMonth, calculateLeave, calculatePay, summariseAttendance, type AttendanceCode } from '../src/lib/hr/engine.ts';
import { professionalTaxCents, salaryFromAnnualCtc } from '../src/lib/finance/salary.ts';

const require = createRequire(pathToFileURL(join(resolve('node_modules'), 'pg/package.json')));
const pg = require('pg');

function loadEnv() {
  const text = readFileSync('.env', 'utf8');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^\uFEFF/, '').trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!process.env[key]?.trim()) process.env[key] = val;
  }
}

function money(cents: number) {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

function days(value: number) {
  return value.toFixed(2);
}

const unpaidBlock = new Set(['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14']);

type Person = {
  key: string;
  code?: string;
  name?: string;
  monthly?: number;
  mark: (date: string) => AttendanceCode;
  opening?: number;
};

const people: Person[] = [
  { key: 'sudheer', mark: (date) => (date === '2026-08-03' ? 'PL' : 'P') },
  { key: 'gandham', code: 'EMP-002', name: 'Gandham Satya Bhaskar', monthly: 25300, opening: 3, mark: (date) => (date === '2026-08-11' ? 'PL' : 'P') },
  { key: 'lovely', code: 'EMP-003', name: 'Lovely Tiwari', monthly: 30000, mark: (date) => (date === '2026-08-24' ? 'PL' : date >= '2026-08-25' && date <= '2026-08-28' ? 'UL' : 'P') },
  { key: 'raj', mark: () => 'P' },
  { key: 'valbhav', code: 'EMP-005', name: 'Valbhav Sahu', monthly: 30000, mark: (date) => (unpaidBlock.has(date) ? 'UL' : 'P') },
  { key: 'utkarsh', code: 'EMP-006', name: 'Utkarsh Tripathi', monthly: 20000, mark: (date) => (unpaidBlock.has(date) ? 'UL' : 'P') },
  { key: 'gowri', code: 'EMP-007', name: 'Gowri Naga Vijaya Bandana', monthly: 15000, mark: (date) => (unpaidBlock.has(date) ? 'UL' : 'P') },
];

function compact(value: string) {
  return value.toLowerCase().replace(/[^a-z]/g, '');
}

loadEnv();
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error('Database URL is missing');
pg.types.setTypeParser(pg.types.builtins.DATE, (value: string) => value);
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value: string) => value);
const client = new pg.Client({
  connectionString,
  ssl: /supabase\.com|pooler\.supabase/.test(connectionString) ? { rejectUnauthorized: false } : undefined,
});

await client.connect();
try {
  await client.query('BEGIN');
  const migration = readFileSync('supabase/migrations/20261014180000_hr_attendance_source.sql', 'utf8');
  await client.query(migration);

  const existing = await client.query(`SELECT id, employee_code, full_name, annual_ctc::text, date_of_joining::text FROM finance_employees`);
  const rows = existing.rows as { id: string; employee_code: string; full_name: string; annual_ctc: string | null; date_of_joining: string | null }[];
  const byKey = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const name = compact(row.full_name);
    if (name.includes('sudheer')) byKey.set('sudheer', row);
    if (name.includes('gubbala') || name.includes('grajkumar')) byKey.set('raj', row);
    if (name.includes('gandham') || name.includes('satyabhaskar')) byKey.set('gandham', row);
    if (name.includes('lovely')) byKey.set('lovely', row);
    if (name.includes('valbhav') || name.includes('vaibhav')) byKey.set('valbhav', row);
    if (name.includes('utkarsh')) byKey.set('utkarsh', row);
    if (name.includes('gowri') || name.includes('bandana')) byKey.set('gowri', row);
  }
  if (!byKey.get('sudheer') || !byKey.get('raj')) throw new Error('Sudheer and Raj Kumar must already exist');

  for (const person of people) {
    if (byKey.get(person.key) || !person.code || !person.name || !person.monthly) continue;
    const inserted = await client.query(
      `INSERT INTO finance_employees (employee_code, full_name, status, date_of_joining, annual_ctc)
       VALUES ($1, $2, 'active', '2026-08-01', $3)
       ON CONFLICT (employee_code) DO UPDATE SET
         date_of_joining = COALESCE(finance_employees.date_of_joining, EXCLUDED.date_of_joining),
         annual_ctc = COALESCE(finance_employees.annual_ctc, EXCLUDED.annual_ctc)
       RETURNING id, employee_code, full_name, annual_ctc::text, date_of_joining::text`,
      [person.code, person.name, (person.monthly * 12).toFixed(2)]
    );
    byKey.set(person.key, inserted.rows[0]);
  }

  await client.query(
    `INSERT INTO hr_holidays (holiday_date, name, holiday_type, year)
     VALUES ('2026-08-10', 'Company Holiday', 'company', 2026)
     ON CONFLICT (holiday_date) DO NOTHING`
  );

  const gandham = byKey.get('gandham');
  if (!gandham) throw new Error('Gandham Satya Bhaskar was not created');
  const ledger = await client.query('SELECT 1 FROM hr_leave_ledger WHERE employee_id=$1 LIMIT 1', [gandham.id]);
  if (!ledger.rows[0]) {
    await client.query(
      `INSERT INTO hr_leave_openings (employee_id, balance, effective_year, effective_month, note)
       VALUES ($1, 3, 2026, 8, 'Opening balance from the August 2026 salary sheet')
       ON CONFLICT (employee_id) DO NOTHING`,
      [gandham.id]
    );
  }

  const settings = await client.query('SELECT * FROM hr_payroll_settings WHERE id=1');
  const policy = settings.rows[0];
  if (!policy) throw new Error('Payroll settings are not initialised');
  const weeklyOff = (policy.weekly_off as number[]).map(Number);
  const calendar = buildMonth(2026, 8, [{ date: '2026-08-10', name: 'Company Holiday' }], weeklyOff);
  const working = calendar.filter((day) => day.kind === 'working');

  const summary: { name: string; code: string; lop: number; payable: number; net: string; monthly: string }[] = [];
  for (const person of people) {
    const employee = byKey.get(person.key);
    if (!employee) throw new Error(`Missing employee ${person.key}`);
    const locked = await client.query(
      `SELECT status FROM hr_monthly_payroll
       WHERE employee_id=$1 AND payroll_year=2026 AND payroll_month=8 AND is_current AND status IN ('approved','paid')`,
      [employee.id]
    );
    if (locked.rows[0]) {
      summary.push({ name: employee.full_name, code: employee.employee_code, lop: 0, payable: 0, net: 'locked', monthly: employee.annual_ctc || '' });
      continue;
    }
    for (const day of working) {
      const status = person.mark(day.date);
      const ref = `sheet:2026-08:${employee.employee_code}:${day.date}`;
      await client.query(
        `INSERT INTO hr_attendance (employee_id, attendance_date, status, source, external_ref)
         VALUES ($1, $2, $3, 'import', $4)
         ON CONFLICT (employee_id, attendance_date) DO UPDATE SET
           status=EXCLUDED.status, source=EXCLUDED.source, external_ref=EXCLUDED.external_ref, updated_at=NOW()
         WHERE hr_attendance.source IS DISTINCT FROM 'manual'`,
        [employee.id, day.date, status, ref]
      );
    }
    const stored = await client.query(
      `SELECT attendance_date::text AS date, status FROM hr_attendance
       WHERE employee_id=$1 AND attendance_date BETWEEN '2026-08-01' AND '2026-08-31'`,
      [employee.id]
    );
    const marks: Record<string, AttendanceCode> = {};
    for (const row of stored.rows as { date: string; status: AttendanceCode }[]) marks[row.date.slice(0, 10)] = row.status;
    const totals = summariseAttendance(calendar, marks, employee.date_of_joining, null, Number(policy.half_day_value));
    const openingRow = await client.query(
      `SELECT balance::text, effective_year, effective_month FROM hr_leave_openings WHERE employee_id=$1`,
      [employee.id]
    );
    let opening = Number(policy.opening_balance_default);
    if (openingRow.rows[0]) {
      const effectiveYear = Number(openingRow.rows[0].effective_year);
      const effectiveMonth = Number(openingRow.rows[0].effective_month);
      if (effectiveYear < 2026 || (effectiveYear === 2026 && effectiveMonth <= 8)) opening = Number(openingRow.rows[0].balance);
    }
    const leave = calculateLeave({
      opening,
      credit: Number(policy.monthly_leave_credit),
      adjustment: 0,
      requestedPaid: totals.requestedPaid,
      unpaid: totals.unpaidLeave,
      maxPaid: Number(policy.max_paid_leave_per_month),
      carryForward: Boolean(policy.carry_forward),
    });
    await client.query(
      `INSERT INTO hr_leave_ledger (
         employee_id, payroll_year, payroll_month, opening_balance, monthly_credit, adjustment,
         available_balance, requested_paid, allowed_paid, excess_paid, unpaid_leave, closing_balance,
         settings_version, status
       ) VALUES ($1,2026,8,$2,$3,0,$4,$5,$6,$7,$8,$9,$10,'draft')
       ON CONFLICT (employee_id, payroll_year, payroll_month) DO UPDATE SET
         opening_balance=EXCLUDED.opening_balance, monthly_credit=EXCLUDED.monthly_credit,
         available_balance=EXCLUDED.available_balance, requested_paid=EXCLUDED.requested_paid,
         allowed_paid=EXCLUDED.allowed_paid, excess_paid=EXCLUDED.excess_paid,
         unpaid_leave=EXCLUDED.unpaid_leave, closing_balance=EXCLUDED.closing_balance,
         settings_version=EXCLUDED.settings_version, status='draft', updated_at=NOW()
       WHERE hr_leave_ledger.status='draft'`,
      [
        employee.id,
        days(leave.opening),
        days(leave.credit),
        days(leave.available),
        days(leave.requestedPaid),
        days(leave.allowedPaid),
        days(leave.excessPaid),
        days(leave.unpaid),
        days(leave.closing),
        policy.version,
      ]
    );
    if (!employee.annual_ctc) continue;
    const structure = salaryFromAnnualCtc(employee.annual_ctc);
    const base = calculatePay({
      monthlyGrossCents: structure.monthlyGrossCents,
      companyWorkingDays: totals.companyWorkingDays,
      eligibleWorkingDays: totals.eligibleWorkingDays,
      workedDays: totals.worked,
      allowedPaidDays: leave.allowedPaid,
      lopDays: leave.lop,
    });
    const pay = calculatePay({
      monthlyGrossCents: structure.monthlyGrossCents,
      companyWorkingDays: totals.companyWorkingDays,
      eligibleWorkingDays: totals.eligibleWorkingDays,
      workedDays: totals.worked,
      allowedPaidDays: leave.allowedPaid,
      lopDays: leave.lop,
      professionalTaxCents: totals.pendingDays === 0 ? professionalTaxCents(base.proratedGrossCents) : 0,
      pfCents: totals.pendingDays === 0 ? structure.pfCents : 0,
    });
    const status = totals.pendingDays > 0 ? 'attendance_pending' : 'ready_for_approval';
    const current = await client.query(
      `SELECT id FROM hr_monthly_payroll WHERE employee_id=$1 AND payroll_year=2026 AND payroll_month=8 AND is_current`,
      [employee.id]
    );
    const values = [
      money(pay.monthlyGrossCents),
      employee.annual_ctc,
      pay.companyWorkingDays,
      days(pay.eligibleWorkingDays),
      days(totals.presentDays),
      days(leave.allowedPaid),
      days(leave.unpaid),
      totals.halfDayCount,
      days(pay.lopDays),
      totals.pendingDays,
      days(pay.payableDays),
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
    ];
    if (!current.rows[0]) {
      await client.query(
        `INSERT INTO hr_monthly_payroll (
           employee_id, payroll_year, payroll_month, revision, monthly_gross, annual_ctc,
           company_working_days, eligible_working_days, present_days, paid_leave_days, unpaid_leave,
           half_days, lop_days, pending_days, payable_days, per_day_salary, prorated_gross, lop_deduction,
           gross_payable, additional_earnings, other_deductions, professional_tax, pf_amount, net_payable,
           settings_version, status
         ) VALUES ($1,2026,8,1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
        [employee.id, ...values]
      );
    } else {
      await client.query(
        `UPDATE hr_monthly_payroll SET
           monthly_gross=$2, annual_ctc=$3, company_working_days=$4, eligible_working_days=$5, present_days=$6,
           paid_leave_days=$7, unpaid_leave=$8, half_days=$9, lop_days=$10, pending_days=$11, payable_days=$12,
           per_day_salary=$13, prorated_gross=$14, lop_deduction=$15, gross_payable=$16, additional_earnings=$17,
           other_deductions=$18, professional_tax=$19, pf_amount=$20, net_payable=$21, settings_version=$22,
           status=$23, updated_at=NOW()
         WHERE id=$1 AND status IN ('draft','attendance_pending','ready_for_approval')`,
        [current.rows[0].id, ...values]
      );
    }
    summary.push({
      name: employee.full_name,
      code: employee.employee_code,
      lop: leave.lop,
      payable: pay.payableDays,
      net: money(pay.netPayableCents),
      monthly: money(structure.monthlyGrossCents),
    });
  }

  await client.query('COMMIT');
  const totalLop = summary.reduce((sum, row) => sum + row.lop, 0);
  const totalNet = summary.reduce((sum, row) => sum + Math.round(Number(row.net) * 100), 0);
  console.log(JSON.stringify({ totalLop, totalNet: money(totalNet), employees: summary }, null, 2));
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  await client.end();
}
