import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchOgMetadata, normalizeAppUrl } from '@/lib/apps/og-metadata';

export const maxDuration = 60;

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const supabase = createAdminClient();
  const { data, error } = await supabase.from('admin_apps').select('*').order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'App name is required' }, { status: 400 });

  let url: string;
  try {
    url = normalizeAppUrl(String(body.url || ''));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Invalid URL' }, { status: 400 });
  }

  const og = await fetchOgMetadata(url);
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('admin_apps')
    .insert({
      name,
      url,
      og_image: og.ogImage,
      og_title: og.ogTitle,
      created_by: auth.email,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
