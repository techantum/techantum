import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { defaultSeo, normalizeSiteSeo } from '@/lib/cms/default-content';
import { revalidateAllMarketingPages } from '@/lib/seo/revalidation';
import { normalizeMarketingTagId } from '@/lib/seo/marketing-tags';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const supabase = createAdminClient();
  const { data } = await supabase.from('site_seo').select('*').eq('id', 1).maybeSingle();
  return NextResponse.json(normalizeSiteSeo(data));
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const body = await request.json();
  const supabase = createAdminClient();

  const allowed = {
    site_title: body.site_title,
    title_template: body.title_template,
    description: body.description,
    keywords: body.keywords,
    site_url: body.site_url,
    og_image_url: body.og_image_url,
    twitter_handle: body.twitter_handle,
    google_verification: body.google_verification,
    canonical_host: body.canonical_host,
    index_site: body.index_site,
    follow_site: body.follow_site,
    header_scripts: body.header_scripts ?? '',
    footer_scripts: body.footer_scripts ?? '',
    gtm_id: normalizeMarketingTagId(body.gtm_id, 'gtm'),
    ga4_id: normalizeMarketingTagId(body.ga4_id, 'ga4'),
    bing_verification: body.bing_verification ?? '',
    facebook_pixel_id: normalizeMarketingTagId(body.facebook_pixel_id, 'numeric'),
    linkedin_partner_id: normalizeMarketingTagId(body.linkedin_partner_id, 'numeric'),
    facebook_app_id: body.facebook_app_id ?? '',
    facebook_url: body.facebook_url ?? '',
    instagram_url: body.instagram_url ?? '',
    linkedin_url: body.linkedin_url ?? '',
    youtube_url: body.youtube_url ?? '',
    twitter_url: body.twitter_url ?? '',
  };

  const { data, error } = await supabase
    .from('site_seo')
    .upsert({ id: 1, ...allowed })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateAllMarketingPages();
  return NextResponse.json(normalizeSiteSeo(data || defaultSeo));
}
