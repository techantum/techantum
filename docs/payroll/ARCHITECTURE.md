# HR payroll architecture

The payroll module lives inside the existing Next.js Super Admin app. It reuses `finance_employees`, annual CTC salary splits, professional tax, payslip PDF generation and `finance_employee_payslips`.

## Flow

Employees → holidays and payroll settings → daily attendance → leave ledger → monthly payroll → approval snapshot → existing payslip.

## Code

- `src/lib/hr/engine.ts` — pure calendar, leave and money calculations.
- `src/lib/hr/service.ts` — persistence, recalculation, approval and exports.
- `src/lib/hr/payslip-map.ts` — maps an approved payroll onto the existing payslip earnings without a second LOP deduction.
- `src/app/api/admin/hr/[...path]/route.ts` — Super Admin APIs.
- `src/components/admin/hr` — attendance, leave, holidays, payroll, settings, dashboard and annual summary.
- `supabase/migrations/20261014160000_hr_attendance_payroll.sql` — additive tables and columns.

## Protection

Payroll APIs call `requireSuperAdmin`. HR pages stay behind `SuperAdminGate`.

One attendance row per employee per date. One leave ledger row per employee per month. One current payroll row per employee per month, with extra revisions kept. Approved rows store a JSON snapshot and are not recalculated.

Money is integer paise. Day fractions are thousandths of a day so half-days stay exact.
