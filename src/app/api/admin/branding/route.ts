import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { defaultBranding, normalizeSiteBranding } from '@/lib/cms/default-content';
import type { SiteBranding } from '@/lib/cms/types';
import { revalidateAllMarketingPages } from '@/lib/seo/revalidation';

const BRANDING_KEYS: (keyof SiteBranding)[] = [
  'company_name',
  'tagline',
  'logo_url',
  'footer_logo_url',
  'favicon_url',
  'logo_letter',
  'phone',
  'phone_href',
  'whatsapp',
  'whatsapp_href',
  'whatsapp_widget_message',
  'email',
  'address',
  'footer_description',
  'copyright_text',
];

function pickBrandingFields(body: Record<string, unknown>): Record<string, unknown> {
  const picked: Record<string, unknown> = { id: 1 };
  for (const key of BRANDING_KEYS) {
    if (key in body) picked[key] = body[key];
  }
  return picked;
}

function isMissingColumnError(message: string) {
  return (
    message.includes('footer_logo_url') ||
    message.includes('favicon_url') ||
    message.includes('whatsapp_widget_message') ||
    message.includes('schema cache')
  );
}

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const supabase = createAdminClient();
  const { data } = await supabase.from('site_branding').select('*').eq('id', 1).maybeSingle();
  return NextResponse.json(normalizeSiteBranding(data ?? undefined));
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const body = await request.json();
  const supabase = createAdminClient();
  let payload = pickBrandingFields(body);

  let { data, error } = await supabase.from('site_branding').upsert(payload).select('*').single();

  if (error && isMissingColumnError(error.message)) {
    const {
      footer_logo_url: _f,
      favicon_url: _i,
      whatsapp_widget_message: _w,
      ...rest
    } = payload;
    payload = rest;
    ({ data, error } = await supabase.from('site_branding').upsert(payload).select('*').single());
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateAllMarketingPages();
  return NextResponse.json(normalizeSiteBranding(data ?? undefined));
}
