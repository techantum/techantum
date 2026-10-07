import { requireAdmin } from '@/lib/admin/auth';
import { writeFinanceAudit } from '@/lib/finance/audit';
import { financeErrorResponse, streamFileResponse } from '@/lib/finance/http';
import { assertPayslipDownloadAccess } from '@/lib/finance/payslips';
import { absoluteFinancePath } from '@/lib/finance/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const { id } = await ctx.params;
    const payslip = await assertPayslipDownloadAccess(id, {
      id: auth.user.id,
      email: auth.email,
      role: auth.role,
    });
    await writeFinanceAudit(undefined, {
      userId: auth.user.id,
      action: 'Payslip Downloaded',
      entityType: 'payslip',
      entityId: id,
    });
    return streamFileResponse(
      absoluteFinancePath(payslip.storage_path),
      payslip.stored_filename || payslip.original_filename,
      payslip.mime_type,
      'attachment'
    );
  } catch (err) {
    return financeErrorResponse(err);
  }
}
