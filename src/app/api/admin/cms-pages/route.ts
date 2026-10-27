import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { invalidateCmsRuntimeCache } from '@/lib/cms';
import { CMS_SITE_PAGES, flattenAdminPages, slugifyPageId } from '@/lib/cms/site-pages';
import { blankServiceDivision, heroFromDivision, overviewFromDivision, packagesFromDivision } from '@/lib/cms/service-catalog';
import { serviceDivisions } from '@/lib/service-packages-data';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('cms_pages').select('*').order('sort_order');
  if (error && /cms_pages/i.test(error.message)) return NextResponse.json({ rows: [] });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data || [] });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const body = await request.json();
  const label = String(body.label || '').trim();
  const id = slugifyPageId(String(body.slug || label));
  if (!label || !id) return NextResponse.json({ error: 'Enter a page name.' }, { status: 400 });
  if (flattenAdminPages(CMS_SITE_PAGES).some((page) => page.id === id || page.route === `/services/${id}`)) {
    return NextResponse.json({ error: 'That page id is already used by a system page.' }, { status: 400 });
  }
  if (body.kind === 'service' && serviceDivisions.some((item) => item.slug === id)) {
    return NextResponse.json({ error: 'That service already exists.' }, { status: 400 });
  }

  const isService = body.kind === 'service';
  const supabase = createAdminClient();
  const route = isService ? `/services/${id}` : `/p/${id}`;
  const { data, error } = await supabase
    .from('cms_pages')
    .insert({
      id,
      label,
      route,
      description: isService ? 'service' : String(body.description || 'Custom page'),
      icon: isService ? 'CubeIcon' : 'DocumentTextIcon',
      is_system: false,
      is_enabled: true,
    })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (isService) {
    const draft = blankServiceDivision(id, label);
    await supabase.from('cms_content').upsert([
      { entry_key: `service.${id}.hero`, entry_group: 'services', label: `${label} Hero`, content: heroFromDivision(draft), is_enabled: true, sort_order: 0 },
      { entry_key: `service.${id}.overview`, entry_group: 'services', label: `${label} Overview`, content: overviewFromDivision(draft), is_enabled: true, sort_order: 1 },
      { entry_key: `service.${id}.packages`, entry_group: 'services', label: `${label} Packages`, content: packagesFromDivision(draft), is_enabled: true, sort_order: 2 },
    ]);
  } else {
    await supabase.from('cms_content').upsert({
      entry_key: `custom.${id}.hero`,
      entry_group: id,
      label: 'Hero Section',
      content: {
        titleLine1: label,
        titleLine2: '',
        description: '',
        primaryCta: 'Get Started',
        primaryCtaHref: '/contact',
        secondaryCta: '',
        secondaryCtaHref: '',
        heroPosterUrl: '',
      },
      is_enabled: true,
      sort_order: 0,
    });
  }
  invalidateCmsRuntimeCache();
  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const body = await request.json();
  const id = String(body.id || '');
  if (!id) return NextResponse.json({ error: 'Missing page id' }, { status: 400 });
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('cms_pages')
    .update({
      label: body.label,
      description: body.description,
      is_enabled: body.is_enabled,
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  invalidateCmsRuntimeCache();
  return NextResponse.json(data);
}
