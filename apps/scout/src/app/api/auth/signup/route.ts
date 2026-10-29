import { NextResponse } from 'next/server';
import { afterAuthPath, createSaasAccount, setSaasCookie } from '@/lib/saas/session';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const created = await createSaasAccount({
      name: String(body.name || ''),
      email: String(body.email || ''),
      password: String(body.password || ''),
      packageId: body.packageId ? String(body.packageId) : null,
    });
    const response = NextResponse.json({
      ok: true,
      accountId: created.account.id,
      next: afterAuthPath(body.packageId ? String(body.packageId) : created.account.pending_package_id, created.account, 'subscriber_admin'),
    });
    await setSaasCookie(response, created.userId);
    return response;
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not create the account' }, { status: 400 });
  }
}
