import { NextResponse } from 'next/server';
import { canManageBilling } from '@/lib/admin/roles';
import { activatePaidPackage, getPackageById } from '@/lib/saas/catalog';
import { financeErrorResponse } from '@/lib/finance/http';
import { FinanceValidationError } from '@/lib/finance/errors';
import { fetchRazorpayOrder, fetchRazorpayPayment, verifyRazorpaySignature } from '@/lib/saas/razorpay';
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
    const pkg = await getPackageById(packageId);
    if (!pkg || pkg.status !== 'active') throw new FinanceValidationError('That package is not available.');
    const order = await fetchRazorpayOrder(orderId);
    if (String(order.notes?.packageId || '') !== packageId) throw new FinanceValidationError('This payment does not match the selected package.');
    if (String(order.notes?.accountId || '') !== actor.account.id) throw new FinanceValidationError('This payment does not belong to this workspace.');
    if (Number(order.amount) !== Math.round(pkg.price_monthly * 100)) throw new FinanceValidationError('The paid amount does not match this package.');
    const payment = await fetchRazorpayPayment(paymentId);
    if (payment.order_id !== orderId) throw new FinanceValidationError('This payment does not match the Razorpay order.');
    if (!['captured', 'authorized'].includes(String(payment.status))) {
      throw new FinanceValidationError('Razorpay has not captured this payment yet.');
    }
    const result = await activatePaidPackage(actor.account, packageId, actor.userId, { orderId, paymentId });
    return NextResponse.json({
      ok: true,
      notice: `Payment received. You are now on ${result.package.name}.`,
      ...result,
    });
  } catch (err) {
    return financeErrorResponse(err);
  }
}
