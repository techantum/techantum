import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('site_redirects')
    .select('*')
    .order('source_path');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const body = await request.json();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('site_redirects')
    .insert({
      source_path: body.source_path,
      destination_path: body.destination_path,
      is_permanent: body.is_permanent ?? true,
      enabled: body.enabled ?? true,
      note: body.note ?? null,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
