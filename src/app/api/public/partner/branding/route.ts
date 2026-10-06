import { NextResponse } from 'next/server';
import { lookupPartnerPublicBranding } from '@/lib/partner/branding';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get('email') || '';
  const code = url.searchParams.get('code') || '';

  if (!email.trim() && !code.trim()) {
    return NextResponse.json({ branding: null });
  }

  const branding = await lookupPartnerPublicBranding({ email, code });
  return NextResponse.json({ branding });
}
