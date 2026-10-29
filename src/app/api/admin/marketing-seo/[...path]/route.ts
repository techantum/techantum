import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { publicSiteOrigin } from '@/lib/auth/public-origin';
import { toCsv } from '@/lib/marketing-seo/csv';
import {
  adsIntegrationStatus,
  buildGscAuthUrl,
  exchangeGscCode,
  gscOAuthRedirectUri,
  gscStatus,
  inspectGscUrl,
  listGscSites,
  newOAuthState,
  saveGscProperty,
  syncGscAnalytics,
} from '@/lib/marketing-seo/gsc';
import {
  bulkKeywordAction,
  campaignBrief,
  deleteAsset,
  deleteKeyword,
  duplicateCampaign,
  ensureMarketingDefaults,
  exportKeywordsCsv,
  importKeywordsCsv,
  latestAudit,
  listAssets,
  listCampaigns,
  listKeywords,
  listLocalSeoChecks,
  listPages,
  marketingOverview,
  pageHistory,
  persistAudit,
  saveAsset,
  saveCampaign,
  saveKeyword,
  saveLocalSeoCheck,
  savePage,
  updateIssue,
} from '@/lib/marketing-seo/service';
import { allowedAuditUrl } from '@/lib/marketing-seo/ssrf';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : 'Request failed';
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const path = (await context.params).path || [];
  if (path[0] === 'gsc' && path[1] === 'callback') {
    return handleGscCallback(request);
  }
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    if (path[0] === 'gsc' && path[1] === 'start') {
      const state = newOAuthState();
      const url = await buildGscAuthUrl(state);
      const response = NextResponse.redirect(url);
      response.cookies.set('gsc_oauth_state', state, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 });
      return response;
    }
    await ensureMarketingDefaults();
    if (!path.length || path[0] === 'overview') return NextResponse.json(await marketingOverview());
    if (path[0] === 'audit') return NextResponse.json(await latestAudit());
    if (path[0] === 'pages' && path[1] === 'history') {
      const url = new URL(request.url);
      return NextResponse.json(await pageHistory(url.searchParams.get('path') || '/'));
    }
    if (path[0] === 'pages') return NextResponse.json(await listPages());
    if (path[0] === 'keywords' && path[1] === 'export') {
      const rows = await listKeywords();
      return new NextResponse(exportKeywordsCsv(rows), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="seo-keywords.csv"' } });
    }
    if (path[0] === 'keywords') return NextResponse.json(await listKeywords());
    if (path[0] === 'assets' && path[1] === 'export') {
      const rows = await listAssets();
      return new NextResponse(toCsv(['asset_type', 'text', 'description', 'url', 'service_category', 'status', 'notes'], rows as Array<Record<string, unknown>>), {
        headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="ads-assets.csv"' },
      });
    }
    if (path[0] === 'assets') return NextResponse.json(await listAssets());
    if (path[0] === 'campaigns') return NextResponse.json(await listCampaigns());
    if (path[0] === 'integrations') {
      return NextResponse.json({
        gsc: await gscStatus(),
        ads: adsIntegrationStatus(),
        gbp: await listLocalSeoChecks(),
        redirectUri: gscOAuthRedirectUri(),
      });
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const path = (await context.params).path || [];
  try {
    const body = await request.json().catch(() => ({}));
    if (path[0] === 'audit' && path[1] === 'run') return NextResponse.json(await persistAudit(auth.user.id));
    if (path[0] === 'keywords' && path[1] === 'import') return NextResponse.json(await importKeywordsCsv(String(body.csv || ''), auth.user.id));
    if (path[0] === 'keywords' && path[1] === 'bulk') {
      await bulkKeywordAction((body.ids || []).map(String), String(body.action || ''));
      return NextResponse.json({ ok: true });
    }
    if (path[0] === 'keywords') return NextResponse.json(await saveKeyword(body, auth.user.id));
    if (path[0] === 'assets') return NextResponse.json(await saveAsset(body, auth.user.id));
    if (path[0] === 'campaigns' && path[1] === 'duplicate') return NextResponse.json(await duplicateCampaign(String(body.id || ''), auth.user.id));
    if (path[0] === 'campaigns' && path[1] === 'brief') {
      const [drafts, assets, keywords] = await Promise.all([listCampaigns(), listAssets(), listKeywords()]);
      const draft = drafts.find((row: { id: string }) => row.id === body.id);
      if (!draft) throw new Error('Draft not found.');
      return NextResponse.json({ text: campaignBrief(draft, assets, keywords) });
    }
    if (path[0] === 'campaigns') return NextResponse.json(await saveCampaign(body, auth.user.id));
    if (path[0] === 'pages') return NextResponse.json(await savePage(body, auth.user.id));
    if (path[0] === 'gsc' && path[1] === 'property') {
      await saveGscProperty(String(body.propertyUri || ''));
      return NextResponse.json(await gscStatus());
    }
    if (path[0] === 'gsc' && path[1] === 'sync') return NextResponse.json(await syncGscAnalytics());
    if (path[0] === 'gsc' && path[1] === 'sites') return NextResponse.json(await listGscSites());
    if (path[0] === 'gsc' && path[1] === 'inspect') {
      const url = String(body.url || '');
      if (!allowedAuditUrl(url, publicSiteOrigin())) throw new Error('Inspect only Techantum URLs.');
      return NextResponse.json(await inspectGscUrl(url));
    }
    if (path[0] === 'gbp') return NextResponse.json(await saveLocalSeoCheck(String(body.id || ''), String(body.status || 'pending'), String(body.notes || '')));
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const path = (await context.params).path || [];
  try {
    const body = await request.json().catch(() => ({}));
    if (path[0] === 'audit' && path[1] === 'issues') return NextResponse.json(await updateIssue(String(body.id || path[2] || ''), String(body.fix_status || body.fixStatus || '')));
    if (path[0] === 'keywords') return NextResponse.json(await saveKeyword(body, auth.user.id));
    if (path[0] === 'assets') return NextResponse.json(await saveAsset(body, auth.user.id));
    if (path[0] === 'campaigns') return NextResponse.json(await saveCampaign(body, auth.user.id));
    if (path[0] === 'pages') return NextResponse.json(await savePage(body, auth.user.id));
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const path = (await context.params).path || [];
  const url = new URL(request.url);
  const id = url.searchParams.get('id') || path[1] || '';
  try {
    if (path[0] === 'keywords') {
      await deleteKeyword(id);
      return NextResponse.json({ ok: true });
    }
    if (path[0] === 'assets') {
      await deleteAsset(id);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    return fail(error);
  }
}

async function handleGscCallback(request: Request) {
  const auth = await requireAdmin();
  const origin = publicSiteOrigin();
  const dest = new URL('/admin/seo-ads?tab=integrations', origin);
  if ('error' in auth && auth.error) {
    dest.searchParams.set('error', 'Sign in to the admin workspace, then connect Search Console again.');
    return NextResponse.redirect(dest);
  }
  const url = new URL(request.url);
  if (url.searchParams.get('error')) {
    dest.searchParams.set('error', url.searchParams.get('error_description') || 'Google authorization was cancelled.');
    return NextResponse.redirect(dest);
  }
  const jar = await cookies();
  if (url.searchParams.get('state') !== jar.get('gsc_oauth_state')?.value) {
    dest.searchParams.set('error', 'Google login expired. Connect again.');
    return NextResponse.redirect(dest);
  }
  try {
    await exchangeGscCode(url.searchParams.get('code') || '');
    dest.searchParams.set('connected', 'gsc');
  } catch (error) {
    dest.searchParams.set('error', error instanceof Error ? error.message : 'Could not connect Search Console.');
  }
  const response = NextResponse.redirect(dest);
  response.cookies.set('gsc_oauth_state', '', { path: '/', maxAge: 0 });
  return response;
}
