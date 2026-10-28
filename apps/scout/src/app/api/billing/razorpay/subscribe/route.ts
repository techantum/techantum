import { NextResponse } from 'next/server';
import { canManageBilling } from '@/lib/admin/roles';
import { getPackageById } from '@/lib/saas/catalog';
import { financeErrorResponse } from '@/lib/finance/http';
import { FinanceValidationError } from '@/lib/finance/errors';
import { createRazorpaySubscription, ensureRazorpayPlan, razorpayConfigured, razorpayKeyId } from '@/lib/saas/razorpay';
import { TRIAL_DAYS } from '@/lib/saas/plans';
import { getSaasActor } from '@/lib/saas/session';
import { q } from '@/lib/finance/db';

export async function POST(request: Request) {
  const actor = await getSaasActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManageBilling(actor.role)) return NextResponse.json({ error: 'Only a Subscriber Admin can start a trial.' }, { status: 403 });
  try {
    if (!razorpayConfigured()) throw new FinanceValidationError('Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the environment.');
    const body = await request.json();
    const packageId = String(body.packageId || actor.account.pending_package_id || '');
    const pkg = await getPackageById(packageId);
    if (!pkg || pkg.status !== 'active') throw new FinanceValidationError('Choose a package to start the trial.');
    const planId = await ensureRazorpayPlan(pkg);
    const startAt = Math.floor(Date.now() / 1000) + TRIAL_DAYS * 86400;
    const subscription = await createRazorpaySubscription({
      planId,
      startAtUnix: startAt,
      notes: {
        accountId: actor.account.id,
        packageId: pkg.id,
        userId: actor.userId,
        kind: 'trial_autopay',
      },
    });
    await q(
      undefined,
      `UPDATE saas_accounts SET pending_package_id=$2, razorpay_subscription_id=$3, updated_at=NOW() WHERE id=$1`,
      [actor.account.id, pkg.id, subscription.id],
    );
    return NextResponse.json({
      keyId: razorpayKeyId(),
      subscriptionId: subscription.id,
      package: { id: pkg.id, name: pkg.name, price_monthly: pkg.price_monthly },
      customer: { name: actor.name, email: actor.email },
    });
  } catch (err) {
    return financeErrorResponse(err);
  }
}
