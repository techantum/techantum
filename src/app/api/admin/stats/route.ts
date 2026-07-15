import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { countEditablePages, countEditableSections } from '@/lib/cms/site-pages';
import { getAllStaticPublicRoutes } from '@/lib/seo/public-routes';

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
    supabase.from('site_seo').select('google_verification, header_scripts').eq('id', 1).maybeSingle(),
  ]);

  const publicRoutes = getAllStaticPublicRoutes();
  const indexedOverrides = (pageSeoRows ?? []).filter((r) => r.index_enabled !== false).length;
  const gaConfigured =
    Boolean(seoRow?.google_verification) ||
    (seoRow?.header_scripts ?? '').includes('googletagmanager') ||
    (seoRow?.header_scripts ?? '').includes('google-analytics');

  return NextResponse.json({
    pages: countEditablePages(),
    publicRoutes: publicRoutes.length,
    contentSections: countEditableSections(),
    totalLeads: totalLeads ?? 0,
    pendingLeads: pendingLeads ?? 0,
    contactedLeads: contactedLeads ?? 0,
    closedLeads: closedLeads ?? 0,
    activeRedirects: redirectCount ?? 0,
    indexedPages: indexedOverrides || publicRoutes.length,
    recentLeads: recentLeads ?? [],
    analytics: {
      configured: gaConfigured,
      note: gaConfigured
        ? 'Page views tracked in Google Analytics'
        : 'Add GA or GTM in SEO → Global Scripts to track page views',
    },
  });
}
