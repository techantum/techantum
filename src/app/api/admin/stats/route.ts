import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { countEditablePages, countEditableSections } from '@/lib/cms/site-pages';
import { getAllStaticPublicRoutes } from '@/lib/seo/public-routes';
import { isGa4Configured } from '@/lib/analytics/ga4-config';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const supabase = createAdminClient();

  const [
    { count: totalLeads },
    { count: pendingLeads },
    { count: contactedLeads },
    { count: closedLeads },
    { count: redirectCount },
    { data: pageSeoRows },
    { data: recentLeads },
    { data: seoRow },
  ] = await Promise.all([
    supabase.from('form_submissions').select('*', { count: 'exact', head: true }),
    supabase.from('form_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('form_submissions').select('*', { count: 'exact', head: true }).eq('status', 'contacted'),
    supabase.from('form_submissions').select('*', { count: 'exact', head: true }).eq('status', 'closed'),
    supabase.from('site_redirects').select('*', { count: 'exact', head: true }).eq('enabled', true),
    supabase.from('page_seo').select('path, index_enabled'),
    supabase
      .from('form_submissions')
      .select('id, name, email, phone, product_category, source, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('site_seo')
      .select('header_scripts, footer_scripts, gtm_id, ga4_id, facebook_pixel_id')
      .eq('id', 1)
      .maybeSingle(),
  ]);

  const publicRoutes = getAllStaticPublicRoutes();
  const indexedOverrides = (pageSeoRows ?? []).filter((r) => r.index_enabled !== false).length;
  const gaConfigured =
    Boolean(seoRow?.gtm_id?.trim()) ||
    Boolean(seoRow?.ga4_id?.trim()) ||
    Boolean(seoRow?.facebook_pixel_id?.trim()) ||
    (seoRow?.header_scripts ?? '').includes('googletagmanager') ||
    (seoRow?.header_scripts ?? '').includes('google-analytics') ||
    (seoRow?.footer_scripts ?? '').includes('googletagmanager') ||
    (seoRow?.footer_scripts ?? '').includes('google-analytics');

  const can = (key: string) => auth.isSuperAdmin || !auth.rbacManaged || auth.access[key] === 'READ' || auth.access[key] === 'FULL';
  const canLeads = can('submissions');
  const canContent = can('content');
  const canSeo = can('page-seo') || can('seo') || can('redirects');

  return NextResponse.json({
    pages: canContent || auth.isSuperAdmin || !auth.rbacManaged ? countEditablePages() : 0,
    publicRoutes: publicRoutes.length,
    contentSections: canContent || auth.isSuperAdmin || !auth.rbacManaged ? countEditableSections() : 0,
    totalLeads: canLeads ? totalLeads ?? 0 : 0,
    pendingLeads: canLeads ? pendingLeads ?? 0 : 0,
    contactedLeads: canLeads ? contactedLeads ?? 0 : 0,
    closedLeads: canLeads ? closedLeads ?? 0 : 0,
    activeRedirects: canSeo ? redirectCount ?? 0 : 0,
    indexedPages: canSeo ? indexedOverrides || publicRoutes.length : 0,
    recentLeads: canLeads ? recentLeads ?? [] : [],
    analytics: {
      configured: gaConfigured,
      apiConfigured: isGa4Configured(),
      note: gaConfigured
        ? isGa4Configured()
          ? 'GA4 tracking + dashboard API connected'
          : 'Tracking active — add GA4 API credentials for dashboard stats'
        : 'Add GTM, GA4, or pixels in Admin → SEO & Marketing',
    },
  });
}
