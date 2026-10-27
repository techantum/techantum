import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDefaultContent } from '@/lib/cms/default-content';
import { revalidateAfterCmsUpdate } from '@/lib/seo/revalidation';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const { key } = await params;
  const decodedKey = decodeURIComponent(key);
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('cms_content')
    .select('*')
    .eq('entry_key', decodedKey)
    .maybeSingle();

  return NextResponse.json(data || { entry_key: decodedKey, content: getDefaultContent(decodedKey) });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const { key } = await params;
  const decodedKey = decodeURIComponent(key);
  const body = await request.json();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('cms_content')
    .upsert({
      entry_key: decodedKey,
      entry_group: body.entry_group,
      label: body.label,
      content: body.content,
      is_enabled: body.is_enabled !== false,
      sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0,
    })
    .select('*')
    .single();

  if (error && /is_enabled|sort_order/i.test(error.message)) {
    const fallback = await supabase
      .from('cms_content')
      .upsert({
        entry_key: decodedKey,
        entry_group: body.entry_group,
        label: body.label,
        content: body.content,
      })
      .select('*')
      .single();
    if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 500 });
    revalidateAfterCmsUpdate(decodedKey);
    return NextResponse.json(fallback.data);
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateAfterCmsUpdate(decodedKey);
  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const { key } = await params;
  const decodedKey = decodeURIComponent(key);
  const body = await request.json();
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {};
  if (typeof body.is_enabled === 'boolean') patch.is_enabled = body.is_enabled;
  if (body.sort_order != null) patch.sort_order = Number(body.sort_order) || 0;
  if (body.label) patch.label = body.label;
  const { data, error } = await supabase.from('cms_content').update(patch).eq('entry_key', decodedKey).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateAfterCmsUpdate(decodedKey);
  return NextResponse.json(data);
}
