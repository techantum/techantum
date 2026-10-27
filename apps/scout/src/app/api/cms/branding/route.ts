import { NextResponse } from 'next/server';
import { requireCmsAdmin } from '@/lib/cms/auth';
import { getRevealeoSite, saveRevealeoBranding } from '@/lib/cms/site';
import { mergeBranding } from '@/lib/cms/defaults';

export async function GET() {
  const auth = await requireCmsAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const site = await getRevealeoSite();
  return NextResponse.json(site.branding);
}

export async function PUT(request: Request) {
  const auth = await requireCmsAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const body = await request.json().catch(() => ({}));
  const saved = await saveRevealeoBranding(mergeBranding(body));
  return NextResponse.json(saved);
}
