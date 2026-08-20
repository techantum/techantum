import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/whatsapp/admin-service';

async function setMode(id: string, mode: 'AI' | 'HYBRID' | 'HUMAN', aiEnabled: boolean, userId: string, action: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .update({ mode, ai_enabled: aiEnabled, handoff_required: mode !== 'AI' })
    .eq('id', id)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message || 'Update failed');
  await logAudit(action, 'conversation', id, userId, { mode });
  return data;
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const { id } = await params;
    const data = await setMode(id, 'HUMAN', false, auth.user.id, 'human_takeover');
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
