import { NextResponse } from 'next/server';
import { createSaasAccount, setSaasCookie } from '@/lib/saas/session';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const created = await createSaasAccount({
      name: String(body.name || ''),
      email: String(body.email || ''),
      password: String(body.password || ''),
    });
    const response = NextResponse.json({ ok: true, accountId: created.account.id });
    await setSaasCookie(response, created.userId);
    return response;
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not create the account' }, { status: 400 });
  }
}
