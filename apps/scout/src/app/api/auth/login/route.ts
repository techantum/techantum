import { NextResponse } from 'next/server';
import { AUTH_PORTALS, type AuthPortal } from '@/lib/saas/portals';
import { afterAuthPath, loginSaasAccount, setSaasCookie } from '@/lib/saas/session';

function asPortal(value: unknown): AuthPortal {
  const raw = String(value || 'subscriber');
  return raw in AUTH_PORTALS ? (raw as AuthPortal) : 'subscriber';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const portal = asPortal(body.portal);
    const result = await loginSaasAccount(String(body.email || ''), String(body.password || ''), body.packageId ? String(body.packageId) : null, portal);
    const response = NextResponse.json({ ok: true, next: afterAuthPath(body.packageId ? String(body.packageId) : null, result.account, result.role) });
    await setSaasCookie(response, result.userId);
    return response;
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not sign in' }, { status: 400 });
  }
}
