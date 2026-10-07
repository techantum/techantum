import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { financeErrorResponse } from '@/lib/finance/http';
import { findEmployeeForUser, listMyPayslips } from '@/lib/finance/payslips';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const employee = await findEmployeeForUser(auth.user.id, auth.email);
    if (!employee) return NextResponse.json({ rows: [], employee: null });
    const rows = await listMyPayslips(employee.id);
    return NextResponse.json({
      employee: {
        id: employee.id,
        employee_code: employee.employee_code,
        full_name: employee.full_name,
        department: employee.department,
        designation: employee.designation,
      },
      rows,
    });
  } catch (err) {
    return financeErrorResponse(err);
  }
}
