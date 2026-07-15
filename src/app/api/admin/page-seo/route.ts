import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const supabase = createAdminClient();
  const { data, error } = await supabase.from('page_seo').select('*').order('path');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const body = await request.json();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('page_seo')
    .upsert({
      path: body.path,
      index_enabled: body.index_enabled ?? true,
      follow_enabled: body.follow_enabled ?? true,
      title: body.title ?? null,
      description: body.description ?? null,
      og_image_url: body.og_image_url ?? null,
      header_scripts: body.header_scripts ?? '',
      footer_scripts: body.footer_scripts ?? '',
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
