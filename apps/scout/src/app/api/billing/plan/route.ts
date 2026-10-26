import { NextResponse } from 'next/server';
import { canManageBilling } from '@/lib/admin/roles';
import { SAAS_PLANS, type SaasPlanId } from '@/lib/saas/plans';
import { getSaasActor, setSaasPlan } from '@/lib/saas/session';

export async function POST(request: Request) {
  const actor = await getSaasActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManageBilling(actor.role)) return NextResponse.json({ error: 'Only a Subscriber Admin can change the plan.' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const plan = String(body.plan || '') as SaasPlanId;
  if (!SAAS_PLANS.some((item) => item.id === plan)) return NextResponse.json({ error: 'Unknown plan' }, { status: 400 });
  if (process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe checkout is configured. Wire STRIPE_PRICE_* ids to finish card billing.' }, { status: 501 });
  }
  await setSaasPlan(actor.account.id, plan);
  return NextResponse.json({ ok: true, notice: 'Plan updated. Add STRIPE_SECRET_KEY when you are ready for card charges.' });
}
