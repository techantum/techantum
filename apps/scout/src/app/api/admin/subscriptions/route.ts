import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/admin/auth';
import { financeErrorResponse } from '@/lib/finance/http';
import { assignPackageToAccount, cancelAccountSubscription, getPackageById, listEvents, listSubscriptionRows } from '@/lib/saas/catalog';
import { q } from '@/lib/finance/db';

export async function GET(request: Request) {
  const auth = await requireSuperAdmin();
  if ('error' in auth) return auth.error;
  const accountId = new URL(request.url).searchParams.get('accountId');
  if (accountId) return NextResponse.json({ events: await listEvents(accountId) });
  return NextResponse.json({ rows: await listSubscriptionRows() });
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin();
  if ('error' in auth) return auth.error;
  try {
    const body = await request.json();
    const accountId = String(body.accountId || '');
    const { rows } = await q(undefined, `SELECT * FROM saas_accounts WHERE id=$1`, [accountId]);
    if (!rows[0]) return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
    if (body.action === 'cancel') {
      await cancelAccountSubscription(accountId, auth.user.id);
      return NextResponse.json({ ok: true, events: await listEvents(accountId) });
    }
    const packageId = String(body.packageId || '');
    const pkg = await getPackageById(packageId);
    if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    await assignPackageToAccount(rows[0], pkg, auth.user.id, 'admin_assigned');
    return NextResponse.json({ ok: true, events: await listEvents(accountId) });
  } catch (err) {
    return financeErrorResponse(err);
  }
}
