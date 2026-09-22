import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    { error: 'Email and password registration is no longer available. Please sign in with Google, Facebook, or WhatsApp.' },
    { status: 410 }
  );
}
