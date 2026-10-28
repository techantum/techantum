import { NextResponse } from 'next/server';
import { canManageBilling } from '@/lib/admin/roles';
import { changeAccountPackage, currentSubscription, listEvents, listPackages, recordEvent, resolveAccess } from '@/lib/saas/catalog';
import { q } from '@/lib/finance/db';
import { financeErrorResponse } from '@/lib/finance/http';
import { cancelRazorpaySubscription, razorpayConfigured, razorpayKeyId } from '@/lib/saas/razorpay';
import { getSaasActor } from '@/lib/saas/session';

function includedAnalyses(slug?: string | null) {
  if (slug === 'business') return null;
  if (slug === 'growth') return 100;
  return 10;
}

export async function GET() {
  const actor = await getSaasActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const access = await resolveAccess(actor.account, actor.role);
  const { has: _has, ...safeAccess } = access;
  const packages = (await listPackages({ activeOnly: true })).map((item) => ({
    ...item,
    description_html: item.description_html,
  }));
  const usage = await q<{ analyses: string }>(
    undefined,
    `SELECT COUNT(*)::text AS analyses
     FROM youtube_ai_analyses a
     JOIN youtube_research_projects p ON p.id = a.project_id
     WHERE p.saas_account_id = $1
       AND a.created_at >= date_trunc('month', NOW())
       AND a.status IN ('ready', 'generating')`,
    [actor.account.id],
  ).catch(() => ({ rows: [{ analyses: '0' }] }));
  return NextResponse.json({
    canManage: canManageBilling(actor.role),
    access: safeAccess,
    package: access.package,
    packages,
    events: await listEvents(actor.account.id),
    usage: {
      analyses: Number(usage.rows[0]?.analyses || 0),
      included: includedAnalyses(access.package?.slug),
    },
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
    if (body.action === 'cancel') {
      const subscriptionId = actor.account.razorpay_subscription_id;
      if (subscriptionId) await cancelRazorpaySubscription(subscriptionId).catch(() => undefined);
      const current = await currentSubscription(actor.account.id);
      await recordEvent({
        subscriptionId: current?.id,
        accountId: actor.account.id,
        type: 'cancel_scheduled',
        fromPackageId: current?.package_id || actor.account.package_id,
        payload: { atPeriodEnd: true },
        createdBy: actor.userId,
      });
      const when = actor.account.trial_ends_at || actor.account.current_period_end;
      const notice = when
        ? `Autopay will stop on ${new Date(when).toLocaleDateString('en-IN')}. You keep this plan until then.`
        : 'Autopay will stop at the end of the current period. You keep this plan until then.';
      return NextResponse.json({ ok: true, notice });
    }
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
