import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchOgMetadata } from '@/lib/apps/og-metadata';

export const maxDuration = 60;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const { id } = await params;
  const supabase = createAdminClient();
  const { data: app, error: loadError } = await supabase.from('admin_apps').select('*').eq('id', id).maybeSingle();
  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 });
  if (!app) return NextResponse.json({ error: 'App not found' }, { status: 404 });

  const og = await fetchOgMetadata(app.url);
  const { data, error } = await supabase
    .from('admin_apps')
    .update({ og_image: og.ogImage, og_title: og.ogTitle })
    .eq('id', id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase.from('admin_apps').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
