import { NextResponse } from 'next/server';
import { verifyHookoohOtp } from '@/lib/saas/otp';
import { afterAuthPath, setSaasCookie } from '@/lib/saas/session';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await verifyHookoohOtp(
      String(body.phone || ''),
      String(body.code || ''),
      body.packageId ? String(body.packageId) : null,
      body.countryCode ? String(body.countryCode) : undefined,
    );
    const response = NextResponse.json({ ok: true, next: afterAuthPath(body.packageId ? String(body.packageId) : null, result.account) });
    await setSaasCookie(response, result.userId);
    return response;
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not verify the code' }, { status: 400 });
  }
}
