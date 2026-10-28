import { NextResponse } from 'next/server';
import { publicAppUrl } from '@/lib/brand';
import { startPackageTrial } from '@/lib/saas/catalog';
import { q } from '@/lib/finance/db';
import { verifyRazorpaySubscriptionSignature } from '@/lib/saas/razorpay';
import type { SaasAccount } from '@/lib/saas/session';

function redirectTo(path: string) {
  return NextResponse.redirect(new URL(path, publicAppUrl()));
}

function trialError(message: string) {
  const url = new URL('/trial', publicAppUrl());
  url.searchParams.set('error', message.slice(0, 240));
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const paymentId = url.searchParams.get('razorpay_payment_id') || '';
  const subscriptionId = url.searchParams.get('razorpay_subscription_id') || '';
  const signature = url.searchParams.get('razorpay_signature') || '';
  if (!paymentId || !subscriptionId || !signature) return trialError('Autopay details are incomplete.');
  try {
    if (!verifyRazorpaySubscriptionSignature(paymentId, subscriptionId, signature)) {
      return trialError('Razorpay could not verify Autopay.');
    }
    const { rows } = await q<SaasAccount>(undefined, `SELECT * FROM saas_accounts WHERE razorpay_subscription_id=$1`, [subscriptionId]);
    const account = rows[0];
    if (!account) return trialError('This Autopay does not match a Hookooh account.');
    const packageId = account.pending_package_id || account.package_id || '';
    if (!packageId) return trialError('Choose a package and start Autopay again.');
    if (account.status === 'pending_autopay' || account.status === 'canceled') {
      await startPackageTrial(account, packageId, account.owner_user_id, subscriptionId);
    }
    return redirectTo('/home');
  } catch (err) {
    return trialError(err instanceof Error ? err.message : 'Could not confirm Autopay.');
  }
}
