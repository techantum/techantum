import { NextResponse } from 'next/server';
import { googleCredentials } from '@/lib/saas/google-oauth';

export async function GET() {
  const { clientId, clientSecret } = await googleCredentials();
  return NextResponse.json({
    google: Boolean(clientId && clientSecret),
    googleClientId: clientId,
    whatsapp: Boolean(process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WHATSAPP_ACCESS_TOKEN),
  });
}
