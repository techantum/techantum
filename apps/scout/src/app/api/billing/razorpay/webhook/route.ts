import { NextResponse } from 'next/server';
import { assignPackageToAccount, getPackageById, recordEvent } from '@/lib/saas/catalog';
import { q } from '@/lib/finance/db';
import { financeErrorResponse } from '@/lib/finance/http';
import { FinanceValidationError } from '@/lib/finance/errors';
import { verifyRazorpayWebhook } from '@/lib/saas/razorpay';

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';
    if (!verifyRazorpayWebhook(raw, signature)) throw new FinanceValidationError('Invalid Razorpay webhook signature.');
    const event = JSON.parse(raw) as {
      event?: string;
      payload?: { payment?: { entity?: { id?: string; order_id?: string; notes?: Record<string, string> } } };
    };
    if (event.event !== 'payment.captured') return NextResponse.json({ ok: true, ignored: true });
    const payment = event.payload?.payment?.entity || {};
    const notes = payment.notes || {};
    const packageId = String(notes.packageId || '');
    const accountId = String(notes.accountId || '');
    if (!packageId || !accountId) return NextResponse.json({ ok: true, ignored: true });
    const pkg = await getPackageById(packageId);
    if (!pkg) return NextResponse.json({ ok: true, ignored: true });
    const { rows } = await q<{ id: string; status: string; current_period_end: string | null }>(
      undefined,
      `SELECT id, status, current_period_end FROM saas_accounts WHERE id=$1`,
      [accountId],
    );
    if (!rows[0]) return NextResponse.json({ ok: true, ignored: true });
    await assignPackageToAccount(rows[0], pkg, notes.userId || null, 'razorpay_paid');
    await recordEvent({
      accountId,
      type: 'razorpay_webhook',
      toPackageId: packageId,
      payload: { paymentId: payment.id, orderId: payment.order_id },
      createdBy: notes.userId || null,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return financeErrorResponse(err);
  }
}
