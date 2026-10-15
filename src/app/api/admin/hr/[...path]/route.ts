import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/admin/auth';
import { financeErrorResponse, fileResponse } from '@/lib/finance/http';
import {
  addLeaveAdjustment,
  annualExport,
  annualPdf,
  annualSummary,
  approvePayroll,
  attendanceHistory,
  deleteHoliday,
  generatePayroll,
  getAttendance,
  getPayroll,
  importAttendance,
  getPayrollSettings,
  hrDashboard,
  listHolidays,
  listLeave,
  listPayroll,
  markPayrollPaid,
  payrollExport,
  revisePayroll,
  saveAttendance,
  saveHoliday,
  savePayrollSettings,
  setLeaveOpening,
  updatePayrollExtras,
} from '@/lib/hr/service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function gate() {
  const auth = await requireSuperAdmin();
  if ('error' in auth && auth.error) return auth;
  return auth;
}

async function bodyOf(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function GET(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const auth = await gate();
  if ('error' in auth && auth.error) return auth.error;
  const path = (await ctx.params).path || [];
  const url = new URL(request.url);
  const year = Number(url.searchParams.get('year') || new Date().getFullYear());
  const month = Number(url.searchParams.get('month') || new Date().getMonth() + 1);
  const query = url.searchParams.get('q') || '';
  try {
    if (path[0] === 'dashboard') return NextResponse.json(await hrDashboard());
    if (path[0] === 'settings') return NextResponse.json(await getPayrollSettings());
    if (path[0] === 'holidays') return NextResponse.json(await listHolidays(year));
    if (path[0] === 'attendance' && path[1] && path[2] === 'history') {
      return NextResponse.json(await attendanceHistory(path[1], year, month));
    }
    if (path[0] === 'attendance') return NextResponse.json(await getAttendance(year, month, query));
    if (path[0] === 'leave') return NextResponse.json(await listLeave(year, month, query));
    if (path[0] === 'payroll' && path[1] === 'export') {
      const file = await payrollExport(year, month);
      return fileResponse(file, `payroll-${year}-${String(month).padStart(2, '0')}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }
    if (path[0] === 'payroll' && path[1]) return NextResponse.json(await getPayroll(path[1]));
    if (path[0] === 'payroll') {
      return NextResponse.json(await listPayroll(year, month, query, url.searchParams.get('status') || ''));
    }
    if (path[0] === 'annual' && path[1] === 'export') {
      const file = await annualExport(year);
      return fileResponse(file, `annual-payroll-${year}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }
    if (path[0] === 'annual' && path[1] === 'pdf') {
      const file = await annualPdf(year);
      return fileResponse(file, `annual-payroll-${year}.pdf`, 'application/pdf');
    }
    if (path[0] === 'annual') return NextResponse.json(await annualSummary(year, url.searchParams.get('employeeId') || ''));
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return financeErrorResponse(err);
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const auth = await gate();
  if ('error' in auth && auth.error) return auth.error;
  const path = (await ctx.params).path || [];
  const body = await bodyOf(request);
  const userId = auth.user.id;
  try {
    if (path[0] === 'settings') return NextResponse.json(await savePayrollSettings(body, userId));
    if (path[0] === 'holidays') return NextResponse.json(await saveHoliday(body, userId));
    if (path[0] === 'attendance' && path[1] === 'import') return NextResponse.json(await importAttendance(body, userId));
    if (path[0] === 'attendance') return NextResponse.json(await saveAttendance(body, userId));
    if (path[0] === 'leave' && path[1] === 'adjustments') return NextResponse.json(await addLeaveAdjustment(body, userId));
    if (path[0] === 'leave' && path[1] === 'opening') return NextResponse.json(await setLeaveOpening(body, userId));
    if (path[0] === 'payroll' && path[1] === 'generate') {
      return NextResponse.json(await generatePayroll(Number(body.year), Number(body.month), userId));
    }
    if (path[0] === 'payroll' && path[1] === 'approve') return NextResponse.json(await approvePayroll(body.ids || [], userId));
    if (path[0] === 'payroll' && path[1] === 'paid') return NextResponse.json(await markPayrollPaid(body.ids || [], userId));
    if (path[0] === 'payroll' && path[2] === 'revise') return NextResponse.json(await revisePayroll(path[1], String(body.reason || ''), userId));
    if (path[0] === 'payroll' && path[2] === 'extras') return NextResponse.json(await updatePayrollExtras(path[1], body, userId));
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return financeErrorResponse(err);
  }
}

export async function PATCH(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const auth = await gate();
  if ('error' in auth && auth.error) return auth.error;
  const path = (await ctx.params).path || [];
  try {
    if (path[0] === 'holidays' && path[1]) return NextResponse.json(await saveHoliday(await bodyOf(request), auth.user.id, path[1]));
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return financeErrorResponse(err);
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const auth = await gate();
  if ('error' in auth && auth.error) return auth.error;
  const path = (await ctx.params).path || [];
  try {
    if (path[0] === 'holidays' && path[1]) return NextResponse.json(await deleteHoliday(path[1], auth.user.id));
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return financeErrorResponse(err);
  }
}
