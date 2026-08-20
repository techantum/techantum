import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ai_knowledge_entries')
    .update({
      category_id: body.category_id,
      title: body.title,
      content: body.content,
      keywords: body.keywords,
      allow_ai: body.allow_ai,
      status: body.status,
      updated_by: auth.user.id,
    })
    .eq('id', id)
    .select('*, ai_knowledge_categories(name, slug)')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase.from('ai_knowledge_entries').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
