# QA report

Date: 14 October 2026

## Results

| Suite | Passed | Failed |
|---|---|---|
| Unit tests (`engine`, `payslip-map`, existing salary) | 18 | 0 |
| Database constraint checks | 3 | 0 |
| Browser end-to-end | 0 | 0, not run |
| Workbook comparison | 0 | 0, workbook file not in the repository |

Constraint checks ran inside a transaction that was rolled back:

- duplicate attendance rejected (`23505`)
- invalid attendance code rejected (`23514`)
- second current payroll row rejected (`23505`)
- no test employee remained

## Defects

No open calculation defects from the unit tests.

The reference workbook was not available, so workbook-specific holiday names and any formula that disagrees with the written rules were not compared. The implemented rules are the ones in `PAYROLL_RULES.md`.

Browser login, payslip PDF layout, and a full Super Admin click-through were not executed in this session.

## Deployment note

Migration `20261014160000_hr_attendance_payroll.sql` has been applied. The Next.js process must be rebuilt and restarted before the new pages are served.
