# HR API

All routes are under `/api/admin/hr` and require a Super Admin session.

| Method | Path | Purpose |
|---|---|---|
| GET | `/dashboard` | Today’s attendance and current-month payroll totals |
| GET/POST | `/settings` | Read or replace payroll policy. POST increments the version |
| GET/POST | `/holidays?year=` | List or create a holiday |
| PATCH/DELETE | `/holidays/:id` | Edit or delete a holiday |
| GET | `/attendance?year&month&q` | Monthly grid, totals and live leave preview |
| POST | `/attendance` | `{ updates: [{ employee_id, date, status }], overwrite, reason }` |
| POST | `/attendance/import` | Biometric or other device ingest. See below |
| GET | `/attendance/:employeeId/history?year&month` | Correction history |
| GET | `/leave?year&month&q` | Leave ledger preview |
| POST | `/leave/adjustments` | `{ employee_id, year, month, amount, reason }` |
| POST | `/leave/opening` | `{ employee_id, year, month, balance, note }` before any ledger exists |
| GET | `/payroll?year&month&q&status` | Current payroll rows and summary |
| POST | `/payroll/generate` | `{ year, month }` |
| GET | `/payroll/:id` | Breakdown, leave row and events |
| POST | `/payroll/approve` | `{ ids }` |
| POST | `/payroll/paid` | `{ ids }` |
| POST | `/payroll/:id/revise` | `{ reason }` |
| POST | `/payroll/:id/extras` | `{ additional_earnings, other_deductions }` |
| GET | `/payroll/export?year&month` | Excel |
| GET | `/annual?year&employeeId` | Calendar, payroll and leave rows |
| GET | `/annual/export?year` | Excel |
| GET | `/annual/pdf?year` | PDF |

Payslips stay on the existing finance API. `POST /api/admin/finance/payslips/generate` uses the current approved payroll when one exists. Send `revise: true` to replace the PDF for a later payroll revision instead of creating a second payslip.

`POST /attendance/import` accepts `{ source, overwrite_manual, entries }`. `source` defaults to `biometric` and cannot be `manual`. Each entry needs `external_ref`, `employee_code` and `date`, plus either `status` (`Present`, `Absent`, `Paid Leave`, `Half Day`, `P`, `PL`, `HD`, `UL`, `UHD` and the existing aliases) or `punches`. The same `external_ref` updates the earlier mark. A day already saved by hand is left unchanged unless `overwrite_manual` is true. Approved payroll rejects the change. A successful import recalculates the draft payroll for the affected months.
