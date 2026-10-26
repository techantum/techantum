import { NextResponse } from 'next/server';
import { publicAppUrl } from '@/lib/brand';
import { clearSaasCookie } from '@/lib/saas/session';

export async function POST() {
  const response = NextResponse.redirect(new URL('/login', publicAppUrl()));
  return clearSaasCookie(response);
}
