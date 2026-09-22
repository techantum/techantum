import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePortalUser } from '@/lib/whatsapp-provider/portal-auth';
import { getAnalytics } from '@/lib/whatsapp-provider/services/dashboard';
import { listTemplates } from '@/lib/whatsapp-provider/services/templates';
import type { DateRangeKey } from '@/lib/whatsapp-provider/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const auth = await requirePortalUser('whatsapp.client.view');
  if ('error' in auth && auth.error) return auth.error;
  const path = (await ctx.params).path || [];
  const url = new URL(request.url);
  const supabase = createAdminClient();
  try {
    if (path[0] === 'me') return NextResponse.json({ clientId: auth.clientId, role: auth.role, email: auth.email });
    if (path[0] === 'dashboard') {
      const { data: client } = await supabase.from('wa_clients').select('id,name,platform_health,onboarding_status,meta_connection_status').eq('id', auth.clientId).maybeSingle();
      const analytics = await getAnalytics({ range: (url.searchParams.get('range') as DateRangeKey) || 'this_month', clientId: auth.clientId });
      return NextResponse.json({ client, analytics });
    }
    if (path[0] === 'phones') {
      const { data } = await supabase.from('wa_phone_numbers').select('id,display_phone_number,verified_name,quality_rating,registration_status,messaging_status,status').eq('client_id', auth.clientId);
      return NextResponse.json({ rows: data || [] });
    }
    if (path[0] === 'templates') return NextResponse.json(await listTemplates({ clientId: auth.clientId, tab: url.searchParams.get('tab') || undefined, q: url.searchParams.get('q') || undefined }));
    if (path[0] === 'messages') {
      const { data } = await supabase.from('wa_messages').select('id,wamid,direction,type,status,created_at').eq('client_id', auth.clientId).order('created_at', { ascending: false }).limit(100);
      return NextResponse.json({ rows: data || [] });
    }
    if (path[0] === 'contacts') {
      const { data } = await supabase.from('wa_contacts').select('id,name,phone,email,opt_in_status,last_interaction_at').eq('client_id', auth.clientId).order('created_at', { ascending: false }).limit(200);
      return NextResponse.json({ rows: data || [] });
    }
    if (path[0] === 'campaigns') {
      const { data } = await supabase.from('wa_campaigns').select('id,name,status,sent_count,delivered_count,read_count,failed_count').eq('client_id', auth.clientId);
      return NextResponse.json({ rows: data || [] });
    }
    if (path[0] === 'inbox') {
      const { data } = await supabase.from('wa_conversations').select('*, wa_contacts(name,phone)').eq('client_id', auth.clientId).order('last_message_at', { ascending: false });
      return NextResponse.json({ conversations: data || [] });
    }
    if (path[0] === 'billing') {
      const { data } = await supabase.from('wa_billing_accounts').select('plan,monthly_fee,billing_cycle,invoice_status,outstanding_amount,renewal_date').eq('client_id', auth.clientId).maybeSingle();
      return NextResponse.json({ billing: data });
    }
    if (path[0] === 'support') {
      const { data } = await supabase.from('wa_support_tickets').select('id,subject,category,priority,status,created_at').eq('client_id', auth.clientId);
      return NextResponse.json({ rows: data || [] });
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const path = (await ctx.params).path || [];
  const auth = await requirePortalUser(path[0] === 'support' ? 'whatsapp.client.view' : 'whatsapp.inbox.reply');
  if ('error' in auth && auth.error) return auth.error;
  const body = await request.json().catch(() => ({}));
  const supabase = createAdminClient();
  if (path[0] === 'support') {
    const { data, error } = await supabase.from('wa_support_tickets').insert({ ...body, client_id: auth.clientId }).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  }
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
