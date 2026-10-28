import { NextResponse } from 'next/server';
import { canManageBilling } from '@/lib/admin/roles';
import { getPackageById } from '@/lib/saas/catalog';
import { financeErrorResponse } from '@/lib/finance/http';
import { createRazorpayOrder, razorpayConfigured, razorpayKeyId } from '@/lib/saas/razorpay';
import { getSaasActor } from '@/lib/saas/session';
import { FinanceValidationError } from '@/lib/finance/errors';

export async function POST(request: Request) {
  const actor = await getSaasActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManageBilling(actor.role)) return NextResponse.json({ error: 'Only a Subscriber Admin can pay for a package.' }, { status: 403 });
  try {
    if (!razorpayConfigured()) throw new FinanceValidationError('Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the environment.');
    const body = await request.json();
    const pkg = await getPackageById(String(body.packageId || ''));
    if (!pkg || pkg.status !== 'active') throw new FinanceValidationError('That package is not available.');
    const order = await createRazorpayOrder({
      amountInr: pkg.price_monthly,
      receipt: `pkg_${pkg.id.slice(0, 8)}_${Date.now()}`.slice(0, 40),
      notes: {
        accountId: actor.account.id,
        packageId: pkg.id,
        userId: actor.userId,
        packageName: pkg.name,
      },
    });
    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency || 'INR',
      keyId: razorpayKeyId(),
      package: { id: pkg.id, name: pkg.name, price_monthly: pkg.price_monthly },
    });
  } catch (err) {
    return financeErrorResponse(err);
  }
}
