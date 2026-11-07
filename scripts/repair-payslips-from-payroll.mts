/**
 * Rebuild generated payslips so LOP / deductions / net match approved payroll.
 * Usage: node --experimental-strip-types --import ./scripts/resolve-ts-tests.mjs scripts/repair-payslips-from-payroll.mts
 */
import { repairPayslipsFromPayroll } from '../src/lib/finance/payslips.ts';

const userId = process.env.REPAIR_USER_ID;
if (!userId) {
  console.error('Set REPAIR_USER_ID to an admin user UUID');
  process.exit(1);
}

const result = await repairPayslipsFromPayroll(userId);
console.log(JSON.stringify(result, null, 2));
