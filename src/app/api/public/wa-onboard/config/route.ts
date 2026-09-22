import { NextResponse } from 'next/server';
import { getPublicMetaSignupConfig } from '@/lib/whatsapp-provider/config';

export async function GET() {
  return NextResponse.json(getPublicMetaSignupConfig());
}
