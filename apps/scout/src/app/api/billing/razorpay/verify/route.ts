import { NextResponse } from 'next/server';
import { canManageBilling } from '@/lib/admin/roles';
import { changeAccountPackage, recordEvent } from '@/lib/saas/catalog';
import { financeErrorResponse } from '@/lib/finance/http';
import { FinanceValidationError } from '@/lib/finance/errors';
import { verifyRazorpaySignature } from '@/lib/saas/razorpay';
import { getSaasActor } from '@/lib/saas/session';

export async function POST(request: Request) {
  const actor = await getSaasActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManageBilling(actor.role)) return NextResponse.json({ error: 'Only a Subscriber Admin can pay for a package.' }, { status: 403 });
  try {
    const body = await request.json();
    const orderId = String(body.razorpay_order_id || '');
    const paymentId = String(body.razorpay_payment_id || '');
    const signature = String(body.razorpay_signature || '');
    const packageId = String(body.packageId || '');
    if (!orderId || !paymentId || !signature || !packageId) throw new FinanceValidationError('Payment details are incomplete.');
    if (!verifyRazorpaySignature(orderId, paymentId, signature)) throw new FinanceValidationError('Razorpay could not verify this payment.');
    const result = await changeAccountPackage(actor.account, packageId, actor.userId);
    await recordEvent({
      accountId: actor.account.id,
      type: 'razorpay_paid',
      toPackageId: packageId,
      payload: { orderId, paymentId, packageName: result.package.name, amountInr: result.package.price_monthly },
      createdBy: actor.userId,
    });
    return NextResponse.json({
      ok: true,
      notice: `Payment received. You are now on ${result.package.name}.`,
      ...result,
    });
  } catch (err) {
    return financeErrorResponse(err);
  }
}
