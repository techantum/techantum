# Payroll rules

The workbook `Techantum_Monthly_Payroll_Leave_Calculator_2026.xlsm` was not in the repository. These rules follow the written payroll brief. Canonical attendance codes are `P`, `PL`, `HD`, `UL`, `UHD`, `WO` and `HOL`. `HPL` and `HUL` are accepted as aliases of `HD` and `UHD`.

## Calendar

Working days = calendar days − weekly offs − company holidays that fall on a working day.

The default week is Monday–Friday. A holiday on Saturday or Sunday stays a weekly off and is not subtracted again.

## Attendance

| Code | Effect |
|---|---|
| P | 1 paid day |
| PL | 1 paid day, consumes 1 leave |
| HD | 1 paid day, consumes 0.5 leave, other half worked |
| UL | 1 LOP day |
| UHD | 0.5 LOP day, other half worked |
| WO / HOL | Not a working day |

A blank working day is pending. It is not paid and it is not loss of pay. Payroll cannot be approved while any eligible working day is pending.

## Leave

Opening = previous month closing, or the configured opening balance when no ledger exists yet.

Available = opening + monthly credit + authorised adjustments.

Allowed paid leave = minimum of requested paid leave, available leave, and the monthly cap (default 5).

Excess = requested − allowed, and becomes LOP.

Closing = available − allowed when carry-forward is on. Otherwise unused leave expires and is not treated as LOP.

The balance cannot go below zero. A month is credited once; recalculation updates the same ledger row.

Default joining-month credit is a full day when the employee is employed on any day of the month. The alternative setting credits a day only for a complete calendar month.

## Salary

Monthly gross comes from annual CTC ÷ 12 and is not written back onto the employee.

Per-day salary = monthly gross / company working days. The final rupee amount is rounded once, to the nearest paise, on the payable-day and LOP-day shares. The stored per-day figure is informational.

For a full month, prorated gross equals monthly gross.

For a joiner or leaver, eligible working days are the company working days inside the joining and last-working dates. Prorated gross and LOP use that same company-working-day denominator.

Gross payable = pay for days worked plus allowed paid leave.

Net payable = gross payable + additional earnings − other deductions − professional tax − PF.

Professional tax uses the existing Telangana slab on the prorated gross, once. PF stays on the existing salary structure (currently zero). Additional earnings are added to special allowance on the payslip so they are not deducted again.

## Approval

Statuses are attendance pending, ready for approval, approved, and paid.

Approval stores the policy version, attendance, leave and amounts. Later salary or settings changes do not rewrite that snapshot.

A correction opens a new revision. The approved row stays in history. Changing attendance in an approved month is rejected until that revision exists.

An approved or paid payroll is the source for a generated payslip. If a payslip already exists, payroll can revise that same payslip instead of inserting a second one. Uploaded historical payslips are not deleted.
