import { NextResponse } from 'next/server';
import { getRevealeoSite } from '@/lib/cms/site';

export const dynamic = 'force-dynamic';

export async function GET() {
  const site = await getRevealeoSite();
  return NextResponse.json(site);
}
