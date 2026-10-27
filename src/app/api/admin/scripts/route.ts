import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { defaultSeo, normalizeSiteSeo } from '@/lib/cms/default-content';
import { revalidateAllMarketingPages } from '@/lib/seo/revalidation';

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
  const actor = !('error' in auth) ? auth.email || 'Super Admin' : 'Super Admin';
  const payload = {
    id: 1,
    header_scripts: body.header_scripts ?? '',
    footer_scripts: body.footer_scripts ?? '',
    header_scripts_enabled: body.header_scripts_enabled !== false,
    footer_scripts_enabled: body.footer_scripts_enabled !== false,
    scripts_updated_at: new Date().toISOString(),
    scripts_updated_by: actor,
  };
  const { data, error } = await supabase.from('site_seo').upsert(payload).select('*').single();
  if (error) {
    const { header_scripts_enabled: _a, footer_scripts_enabled: _b, scripts_updated_at: _c, scripts_updated_by: _d, ...rest } = payload;
    const fallback = await supabase.from('site_seo').upsert(rest).select('*').single();
    if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 500 });
    revalidateAllMarketingPages();
    return NextResponse.json(normalizeSiteSeo(fallback.data || defaultSeo));
  }
  revalidateAllMarketingPages();
  return NextResponse.json(normalizeSiteSeo(data || defaultSeo));
}
