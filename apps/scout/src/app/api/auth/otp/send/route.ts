import { NextResponse } from 'next/server';
import { sendHookoohOtp } from '@/lib/saas/otp';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await sendHookoohOtp(String(body.phone || ''), body.countryCode ? String(body.countryCode) : undefined);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not send the code' }, { status: 400 });
  }
}
