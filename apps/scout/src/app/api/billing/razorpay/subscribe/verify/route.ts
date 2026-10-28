import { NextResponse } from 'next/server';
import { canManageBilling } from '@/lib/admin/roles';
import { startPackageTrial } from '@/lib/saas/catalog';
import { financeErrorResponse } from '@/lib/finance/http';
import { FinanceValidationError } from '@/lib/finance/errors';
import { verifyRazorpaySubscriptionSignature } from '@/lib/saas/razorpay';
import { getSaasActor } from '@/lib/saas/session';

export async function POST(request: Request) {
  const actor = await getSaasActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManageBilling(actor.role)) return NextResponse.json({ error: 'Only a Subscriber Admin can start a trial.' }, { status: 403 });
  try {
    const body = await request.json();
    const paymentId = String(body.razorpay_payment_id || '');
    const subscriptionId = String(body.razorpay_subscription_id || '');
    const signature = String(body.razorpay_signature || '');
    const packageId = String(body.packageId || actor.account.pending_package_id || '');
    if (!paymentId || !subscriptionId || !signature || !packageId) throw new FinanceValidationError('Autopay details are incomplete.');
    if (!verifyRazorpaySubscriptionSignature(paymentId, subscriptionId, signature)) {
      throw new FinanceValidationError('Razorpay could not verify Autopay.');
    }
    const pkg = await startPackageTrial(actor.account, packageId, actor.userId, subscriptionId);
    return NextResponse.json({ ok: true, notice: `Autopay is set. Your 14-day ${pkg.name} trial is active.`, next: '/home' });
  } catch (err) {
    return financeErrorResponse(err);
  }
}
