# Implementation summary

## New

- Holiday calendar
- Versioned payroll settings
- Daily and monthly attendance, including bulk updates and a change history
- Leave ledger with monthly credit, carry-forward, half-days, a five-day cap and excess leave converted to LOP
- Monthly payroll draft, approval, payment, revision and snapshots
- HR dashboard cards and an annual payroll/leave summary with Excel and PDF export

## Reused

- Employee records and annual CTC on the existing Employees page. Last working date was added for mid-month leavers.
- Salary split, professional tax and PF from `src/lib/finance/salary.ts`
- Payslip PDF, storage and the one-payslip-per-month rule

Approved payroll supplies LOP, paid leave, working days and net pay. Generating again with `revise: true` updates that payslip instead of inserting another one. Older uploaded payslips are left in place.

## Database

New tables: `hr_payroll_settings`, `hr_payroll_settings_versions`, `hr_holidays`, `hr_attendance`, `hr_attendance_audit`, `hr_leave_openings`, `hr_leave_adjustments`, `hr_leave_ledger`, `hr_monthly_payroll`, `hr_payroll_events`.

Extended: `finance_employees.last_working_date`, and payslip columns for working days, payable days, paid leave, payroll id and revision. `lop_days` and `lpr_days` are now decimals so half-days can be stored.

Rollback is a forward migration that drops only those new tables and columns. Do not drop them if payroll rows have been approved.
