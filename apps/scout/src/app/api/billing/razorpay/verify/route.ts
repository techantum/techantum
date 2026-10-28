import { NextResponse } from 'next/server';
import { canManageBilling } from '@/lib/admin/roles';
import { publicAppUrl } from '@/lib/brand';
import { activatePaidPackage, getPackageById } from '@/lib/saas/catalog';
import { financeErrorResponse } from '@/lib/finance/http';
import { FinanceValidationError } from '@/lib/finance/errors';
import { fetchRazorpayOrder, fetchRazorpayPayment, verifyRazorpaySignature } from '@/lib/saas/razorpay';
import { getSaasActor, type SaasActor } from '@/lib/saas/session';

async function completePackagePayment(actor: SaasActor, input: { orderId: string; paymentId: string; signature: string; packageId: string }) {
  if (!input.orderId || !input.paymentId || !input.signature || !input.packageId) throw new FinanceValidationError('Payment details are incomplete.');
  if (!verifyRazorpaySignature(input.orderId, input.paymentId, input.signature)) throw new FinanceValidationError('Razorpay could not verify this payment.');
  const pkg = await getPackageById(input.packageId);
  if (!pkg || pkg.status !== 'active') throw new FinanceValidationError('That package is not available.');
  const order = await fetchRazorpayOrder(input.orderId);
  if (String(order.notes?.packageId || '') !== input.packageId) throw new FinanceValidationError('This payment does not match the selected package.');
  if (String(order.notes?.accountId || '') !== actor.account.id) throw new FinanceValidationError('This payment does not belong to this workspace.');
  if (Number(order.amount) !== Math.round(pkg.price_monthly * 100)) throw new FinanceValidationError('The paid amount does not match this package.');
  const payment = await fetchRazorpayPayment(input.paymentId);
  if (payment.order_id !== input.orderId) throw new FinanceValidationError('This payment does not match the Razorpay order.');
  if (!['captured', 'authorized'].includes(String(payment.status))) {
    throw new FinanceValidationError('Razorpay has not captured this payment yet.');
  }
  return activatePaidPackage(actor.account, input.packageId, actor.userId, { orderId: input.orderId, paymentId: input.paymentId });
}

export async function GET(request: Request) {
  const actor = await getSaasActor();
  const billing = new URL('/billing', publicAppUrl());
  if (!actor) return NextResponse.redirect(new URL('/login', publicAppUrl()));
  const url = new URL(request.url);
  try {
    if (!canManageBilling(actor.role)) throw new FinanceValidationError('Only a Subscriber Admin can pay for a package.');
    const result = await completePackagePayment(actor, {
      orderId: url.searchParams.get('razorpay_order_id') || '',
      paymentId: url.searchParams.get('razorpay_payment_id') || '',
      signature: url.searchParams.get('razorpay_signature') || '',
      packageId: url.searchParams.get('package_id') || '',
    });
    billing.searchParams.set('paid', `Payment received. You are now on ${result.package.name}.`);
    return NextResponse.redirect(billing);
  } catch (err) {
    billing.searchParams.set('error', err instanceof Error ? err.message.slice(0, 240) : 'Could not confirm the payment.');
    return NextResponse.redirect(billing);
  }
}

export async function POST(request: Request) {
  const actor = await getSaasActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManageBilling(actor.role)) return NextResponse.json({ error: 'Only a Subscriber Admin can pay for a package.' }, { status: 403 });
  try {
    const body = await request.json();
    const result = await completePackagePayment(actor, {
      orderId: String(body.razorpay_order_id || ''),
      paymentId: String(body.razorpay_payment_id || ''),
      signature: String(body.razorpay_signature || ''),
      packageId: String(body.packageId || ''),
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
