import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const supabase = createAdminClient();
  const [{ data: categories }, { data: entries }] = await Promise.all([
    supabase.from('ai_knowledge_categories').select('*').order('sort_order'),
    supabase.from('ai_knowledge_entries').select('*, ai_knowledge_categories(name, slug)').order('updated_at', { ascending: false }),
  ]);
  return NextResponse.json({ categories: categories || [], entries: entries || [] });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const body = (await request.json()) as {
    category_id?: string;
    title?: string;
    content?: string;
    keywords?: string;
    allow_ai?: boolean;
    status?: string;
  };
  if (!body.category_id || !body.title?.trim() || !body.content?.trim()) {
    return NextResponse.json({ error: 'Category, title and content are required' }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ai_knowledge_entries')
    .insert({
      category_id: body.category_id,
      title: body.title.trim(),
      content: body.content.trim(),
      keywords: body.keywords?.trim() || null,
      allow_ai: body.allow_ai ?? true,
      status: body.status || 'DRAFT',
      source_type: 'MANUAL',
      created_by: auth.user.id,
      updated_by: auth.user.id,
    })
    .select('*, ai_knowledge_categories(name, slug)')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
