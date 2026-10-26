import { NextResponse } from 'next/server';
import { loginSaasAccount, setSaasCookie } from '@/lib/saas/session';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = await loginSaasAccount(String(body.email || ''), String(body.password || ''));
    const response = NextResponse.json({ ok: true });
    await setSaasCookie(response, userId);
    return response;
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not sign in' }, { status: 400 });
  }
}
