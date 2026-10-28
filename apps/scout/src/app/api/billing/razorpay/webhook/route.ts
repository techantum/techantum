import { NextResponse } from 'next/server';
import { activatePaidPackage, getPackageById, startPackageTrial } from '@/lib/saas/catalog';
import { q } from '@/lib/finance/db';
import { financeErrorResponse } from '@/lib/finance/http';
import { FinanceValidationError } from '@/lib/finance/errors';
import { verifyRazorpayWebhook } from '@/lib/saas/razorpay';
import type { SaasAccount } from '@/lib/saas/session';

async function accountByIdOrSubscription(accountId: string, subscriptionId: string) {
  if (accountId) {
    const byId = await q<SaasAccount>(undefined, `SELECT * FROM saas_accounts WHERE id=$1`, [accountId]);
    if (byId.rows[0]) return byId.rows[0];
  }
  if (subscriptionId) {
    const bySub = await q<SaasAccount>(undefined, `SELECT * FROM saas_accounts WHERE razorpay_subscription_id=$1`, [subscriptionId]);
    if (bySub.rows[0]) return bySub.rows[0];
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';
    if (!verifyRazorpayWebhook(raw, signature)) throw new FinanceValidationError('Invalid Razorpay webhook signature.');
    const event = JSON.parse(raw) as {
      event?: string;
      payload?: {
        payment?: { entity?: { id?: string; order_id?: string; notes?: Record<string, string> } };
        subscription?: { entity?: { id?: string; notes?: Record<string, string>; plan_id?: string } };
      };
    };
    const payment = event.payload?.payment?.entity || {};
    const subscription = event.payload?.subscription?.entity || {};
    const notes = { ...(payment.notes || {}), ...(subscription.notes || {}) };
    const packageId = String(notes.packageId || '');
    const accountId = String(notes.accountId || '');
    const userId = notes.userId || null;
    const paymentId = String(payment.id || '');
    const orderId = String(payment.order_id || '');
    const subscriptionId = String(subscription.id || notes.subscriptionId || '');

    if (event.event === 'subscription.authenticated') {
      const account = await accountByIdOrSubscription(accountId, subscriptionId);
      const pkgId = packageId || account?.pending_package_id || '';
      if (!account || !pkgId || !subscriptionId) return NextResponse.json({ ok: true, ignored: true });
      if (account.status === 'pending_autopay' || account.status === 'canceled') {
        await startPackageTrial(account, pkgId, userId, subscriptionId);
      }
      return NextResponse.json({ ok: true });
    }

    if (event.event === 'subscription.charged') {
      const account = await accountByIdOrSubscription(accountId, subscriptionId);
      const pkgId = packageId || account?.package_id || account?.pending_package_id || '';
      if (!account || !pkgId) return NextResponse.json({ ok: true, ignored: true });
      const pkg = await getPackageById(pkgId);
      if (!pkg) return NextResponse.json({ ok: true, ignored: true });
      await activatePaidPackage(account, pkgId, userId, { orderId, paymentId, subscriptionId });
      return NextResponse.json({ ok: true });
    }

    if (event.event !== 'payment.captured') return NextResponse.json({ ok: true, ignored: true });
    if (!packageId || !accountId || !paymentId) return NextResponse.json({ ok: true, ignored: true });
    const pkg = await getPackageById(packageId);
    if (!pkg) return NextResponse.json({ ok: true, ignored: true });
    const { rows } = await q<SaasAccount>(undefined, `SELECT * FROM saas_accounts WHERE id=$1`, [accountId]);
    if (!rows[0]) return NextResponse.json({ ok: true, ignored: true });
    await activatePaidPackage(rows[0], packageId, userId, { orderId, paymentId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return financeErrorResponse(err);
  }
}
