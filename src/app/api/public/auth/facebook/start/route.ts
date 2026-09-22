import { NextResponse } from 'next/server';
import { publicSiteOrigin } from '@/lib/auth/public-origin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const origin = publicSiteOrigin();
  return NextResponse.redirect(
    new URL(
      `/login?error=${encodeURIComponent('Facebook Login is not available on this Meta app. Use Google or WhatsApp OTP.')}`,
      origin
    )
  );
}
