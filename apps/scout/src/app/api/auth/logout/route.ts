import { NextResponse } from 'next/server';
import { publicAppUrl } from '@/lib/brand';
import { clearSaasCookie } from '@/lib/saas/session';

function loggedOut() {
  const response = NextResponse.redirect(new URL('/', publicAppUrl()));
  return clearSaasCookie(response);
}

export async function GET() {
  return loggedOut();
}

export async function POST() {
  return loggedOut();
}
