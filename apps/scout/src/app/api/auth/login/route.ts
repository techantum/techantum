import { NextResponse } from 'next/server';
import { afterAuthPath, loginSaasAccount, setSaasCookie } from '@/lib/saas/session';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await loginSaasAccount(String(body.email || ''), String(body.password || ''), body.packageId ? String(body.packageId) : null);
    const response = NextResponse.json({ ok: true, next: afterAuthPath(body.packageId ? String(body.packageId) : null, result.account) });
    await setSaasCookie(response, result.userId);
    return response;
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not sign in' }, { status: 400 });
  }
}
