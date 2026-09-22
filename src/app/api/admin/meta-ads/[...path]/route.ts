import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/admin/auth';
import { getMetaAdsDashboard, listMetaAdsCampaigns, listMetaAdsLogs } from '@/lib/meta-ads/dashboard';
import { runMetaAdsSync } from '@/lib/meta-ads/sync';
import { publicMetaAdsStatus } from '@/lib/meta-ads/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

function denyTableMissing(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  if (/meta_ads_|schema cache|does not exist/i.test(message)) {
    return NextResponse.json(
      {
        error:
          'Meta Ads tables are not in the database yet. Run supabase/migrations/20260922180000_meta_ads.sql in the Supabase SQL editor.',
      },
      { status: 503 }
    );
  }
  return null;
}

export async function GET(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const auth = await requireSuperAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const path = (await ctx.params).path || [];
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  const page = Number(url.searchParams.get('page') || 1);
  const pageSize = Math.min(Number(url.searchParams.get('pageSize') || 50), 100);

  try {
    if (path[0] === 'status') return NextResponse.json(publicMetaAdsStatus());
    if (path[0] === 'dashboard') return NextResponse.json(await getMetaAdsDashboard());
    if (path[0] === 'campaigns') return NextResponse.json(await listMetaAdsCampaigns(q, page, pageSize));
    if (path[0] === 'logs') return NextResponse.json(await listMetaAdsLogs(q, page, pageSize));
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    const missing = denyTableMissing(error);
    if (missing) return missing;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load Meta Ads data' }, { status: 500 });
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const auth = await requireSuperAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const path = (await ctx.params).path || [];
  if (path[0] !== 'sync') return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const summary = await runMetaAdsSync('user' in auth ? auth.user.id : null);
    return NextResponse.json(summary, { status: summary.status === 'COMPLETE' ? 200 : 422 });
  } catch (error) {
    const missing = denyTableMissing(error);
    if (missing) return missing;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Meta Ads sync failed' }, { status: 500 });
  }
}
