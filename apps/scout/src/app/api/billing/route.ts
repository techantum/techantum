import { NextResponse } from 'next/server';
import { canManageBilling } from '@/lib/admin/roles';
import { changeAccountPackage, listEvents, listPackages, resolveAccess } from '@/lib/saas/catalog';
import { financeErrorResponse } from '@/lib/finance/http';
import { razorpayConfigured, razorpayKeyId } from '@/lib/saas/razorpay';
import { getSaasActor } from '@/lib/saas/session';

export async function GET() {
  const actor = await getSaasActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const access = await resolveAccess(actor.account, actor.role);
  const { has: _has, ...safeAccess } = access;
  const packages = (await listPackages({ activeOnly: true })).map((item) => ({
    ...item,
    description_html: item.description_html,
  }));
  return NextResponse.json({
    canManage: canManageBilling(actor.role),
    access: safeAccess,
    package: access.package,
    packages,
    events: await listEvents(actor.account.id),
    account: actor.account,
    customer: { name: actor.name, email: actor.email },
    razorpay: {
      configured: razorpayConfigured(),
      keyId: razorpayConfigured() ? razorpayKeyId() : '',
    },
  });
}

export async function POST(request: Request) {
  const actor = await getSaasActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManageBilling(actor.role)) return NextResponse.json({ error: 'Only a Subscriber Admin can change the package.' }, { status: 403 });
  try {
    const body = await request.json();
    const packageId = String(body.packageId || '');
    const result = await changeAccountPackage(actor.account, packageId, actor.userId);
    const notice = result.immediate
      ? `Moved to ${result.package.name}.`
      : `Downgrade to ${result.package.name} is scheduled for ${new Date(result.effectiveAt).toLocaleDateString('en-IN')}. Your current features stay until then.`;
    return NextResponse.json({ ok: true, notice, ...result });
  } catch (err) {
    return financeErrorResponse(err);
  }
}
