# Test plan

## Automated

`npm test` includes:

- `src/lib/hr/engine.test.ts`
- `src/lib/hr/payslip-map.test.ts`
- existing `src/lib/finance/salary.test.ts`

Covered cases: full attendance, one unpaid day, unpaid half-day, paid leave with balance, half-day leave consumption, monthly credit, carry-forward, five-day cap, excess leave to LOP, zero balance, holiday on a weekend, leap-year February, pending days excluded from LOP, mid-month proration, single professional-tax deduction, and payslip net equal to approved payroll.

## Database

Migration `20261014160000_hr_attendance_payroll.sql` applied to the configured database.

Rolled-back checks:

- duplicate attendance for the same employee and date is rejected
- an unknown attendance code is rejected
- a second current payroll row for the same month is rejected
- the test employee was not left in the database

## Not executed here

- Signed-in browser walkthrough of every HR page
- PDF visual comparison
- Workbook formula comparison, because the `.xlsm` file was not in the repository
- Concurrent two-user editing
