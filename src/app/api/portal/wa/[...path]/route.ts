import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePortalUser } from '@/lib/whatsapp-provider/portal-auth';
import type { WaPermission } from '@/lib/whatsapp-provider/permissions';
import { refreshPortalFromMeta, addPortalPhoneNumber, requestPortalPhoneCode, verifyPortalPhoneCode, registerPortalPhone } from '@/lib/whatsapp-provider/services/onboarding';
import { createAndSubmitPortalTemplate, listTemplates, saveTemplate, submitTemplateToMeta } from '@/lib/whatsapp-provider/services/templates';
import { getPortalWorkspace, listPortalMessages, refreshPortalIfStale } from '@/lib/whatsapp-provider/services/portal-workspace';
import type { DateRangeKey } from '@/lib/whatsapp-provider/types';

export const dynamic = 'force-dynamic';

function postPermission(path: string): WaPermission {
  if (path === 'support') return 'whatsapp.client.view';
  if (path === 'phones' || path === 'sync') return 'whatsapp.onboarding.manage';
  if (path === 'templates') return 'whatsapp.template.create';
  return 'whatsapp.inbox.reply';
}

export async function GET(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const auth = await requirePortalUser('whatsapp.client.view');
  if ('error' in auth && auth.error) return auth.error;
  const path = (await ctx.params).path || [];
  const url = new URL(request.url);
  const supabase = createAdminClient();
  try {
    if (path[0] === 'me') return NextResponse.json({ clientId: auth.clientId, role: auth.role, email: auth.email });
    if (path[0] === 'dashboard') {
      return NextResponse.json(
        await getPortalWorkspace(auth.clientId, auth.user.id, (url.searchParams.get('range') as DateRangeKey) || 'this_month'),
      );
    }
    if (path[0] === 'phones') {
      await refreshPortalIfStale(auth.clientId, auth.user.id);
      const { data } = await supabase
        .from('wa_phone_numbers')
        .select('id,phone_number_id,display_phone_number,verified_name,quality_rating,registration_status,messaging_status,status,raw_json,created_at,last_synced_at')
        .eq('client_id', auth.clientId)
        .order('created_at', { ascending: true });
      return NextResponse.json({ rows: data || [] });
    }
    if (path[0] === 'templates') {
      return NextResponse.json(
        await listTemplates({
          clientId: auth.clientId,
          tab: url.searchParams.get('tab') || undefined,
          q: url.searchParams.get('q') || undefined,
          page: Number(url.searchParams.get('page') || 1),
          pageSize: Number(url.searchParams.get('pageSize') || 25),
        }),
      );
    }
    if (path[0] === 'messages') return NextResponse.json(await listPortalMessages(auth.clientId, 120));
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
  const auth = await requirePortalUser(postPermission(path[0] || ''));
  if ('error' in auth && auth.error) return auth.error;
  const body = await request.json().catch(() => ({}));
  const supabase = createAdminClient();
  try {
    if (path[0] === 'support') {
      const { data, error } = await supabase.from('wa_support_tickets').insert({ ...body, client_id: auth.clientId }).select('*').single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json(data);
    }
    if (path[0] === 'sync') {
      return NextResponse.json(await refreshPortalFromMeta(auth.clientId, auth.user.id));
    }
    if (path[0] === 'phones') {
      const action = String(body.action || 'add');
      if (action === 'add') {
        return NextResponse.json(await addPortalPhoneNumber(auth.clientId, { cc: String(body.cc || ''), phoneNumber: String(body.phoneNumber || ''), verifiedName: String(body.verifiedName || ''), actorId: auth.user.id }));
      }
      if (action === 'request_code') {
        return NextResponse.json(await requestPortalPhoneCode(auth.clientId, { phoneNumberId: String(body.phoneNumberId || ''), method: body.method === 'VOICE' ? 'VOICE' : 'SMS' }));
      }
      if (action === 'verify') {
        return NextResponse.json(await verifyPortalPhoneCode(auth.clientId, { phoneNumberId: String(body.phoneNumberId || ''), code: String(body.code || ''), actorId: auth.user.id }));
      }
      if (action === 'register') {
        return NextResponse.json(await registerPortalPhone(auth.clientId, { phoneNumberId: String(body.phoneNumberId || ''), pin: String(body.pin || ''), actorId: auth.user.id }));
      }
      return NextResponse.json({ error: 'Unknown phone action.' }, { status: 400 });
    }
    if (path[0] === 'templates') {
      const action = String(body.action || 'create');
      if (action === 'submit' && body.id) {
        const submitAuth = await requirePortalUser('whatsapp.template.submit_meta');
        if ('error' in submitAuth && submitAuth.error) return submitAuth.error;
        const { data: waba } = await supabase.from('wa_business_accounts').select('waba_id').eq('client_id', auth.clientId).order('created_at', { ascending: true }).limit(1).maybeSingle();
        await supabase
          .from('wa_templates')
          .update({ internal_status: 'INTERNAL_APPROVED', waba_id: waba?.waba_id || undefined })
          .eq('id', body.id)
          .eq('client_id', auth.clientId);
        return NextResponse.json(await submitTemplateToMeta(String(body.id), auth.user.id));
      }
      const draft = {
        clientId: auth.clientId,
        actorId: auth.user.id,
        name: String(body.name || '').trim().toLowerCase().replace(/\s+/g, '_'),
        category: String(body.category || 'UTILITY').toUpperCase(),
        language: String(body.language || 'en'),
        headerType: String(body.headerType || 'NONE'),
        headerContent: body.headerContent ? String(body.headerContent) : undefined,
        body: String(body.body || ''),
        footer: body.footer ? String(body.footer) : undefined,
        examples: body.examples || {},
        buttons: body.buttons || [],
      };
      if (action === 'create_submit' || body.submitToMeta) {
        const submitAuth = await requirePortalUser('whatsapp.template.submit_meta');
        if ('error' in submitAuth && submitAuth.error) return submitAuth.error;
        return NextResponse.json(await createAndSubmitPortalTemplate(draft));
      }
      return NextResponse.json(await saveTemplate(draft, true));
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    const status = typeof err === 'object' && err && 'status' in err ? Number((err as { status?: number }).status) || 400 : 400;
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Request failed.' }, { status });
  }
}
