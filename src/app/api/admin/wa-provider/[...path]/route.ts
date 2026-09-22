import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/admin/auth';
import { providerHasPermission, type WaPermission } from '@/lib/whatsapp-provider/permissions';
import { getPublicMetaSignupConfig, getMetaProviderConfig, META_PERMISSIONS } from '@/lib/whatsapp-provider/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient, getClient, listClients, setClientStatus, syncClientFromMeta, updateClient } from '@/lib/whatsapp-provider/services/clients';
import { completeEmbeddedSignup, startOnboarding } from '@/lib/whatsapp-provider/services/onboarding';
import { getAnalytics, getProviderDashboard } from '@/lib/whatsapp-provider/services/dashboard';
import { cloneLibraryTemplate, listTemplates, reviewTemplate, saveTemplate, submitTemplateToMeta } from '@/lib/whatsapp-provider/services/templates';
import { maskWebhookPayload, processWebhookEvent } from '@/lib/whatsapp-provider/services/webhooks';
import { seedDemoProviderData } from '@/lib/whatsapp-provider/services/seed';
import { MetaWhatsAppService } from '@/lib/whatsapp-provider/meta/service';
import { readClientCredential } from '@/lib/whatsapp-provider/credentials';
import { writeAuditLog } from '@/lib/whatsapp-provider/audit';
import type { DateRangeKey, TemplateDraft } from '@/lib/whatsapp-provider/types';

export const dynamic = 'force-dynamic';

function deny() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

function need(role: string, permission: WaPermission) {
  return providerHasPermission(role, permission);
}

async function parseBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function listTable(table: string, searchCols: string[], request: Request, extra?: Record<string, string>) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  const page = Number(url.searchParams.get('page') || 1);
  const pageSize = Math.min(Number(url.searchParams.get('pageSize') || 25), 100);
  const from = (page - 1) * pageSize;
  const supabase = createAdminClient();
  let query = supabase.from(table).select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, from + pageSize - 1);
  Object.entries(extra || {}).forEach(([key, value]) => {
    if (value) query = query.eq(key, value);
  });
  if (q && searchCols.length) query = query.or(searchCols.map((col) => `${col}.ilike.%${q}%`).join(','));
  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return { rows: data || [], total: count || 0, page, pageSize };
}

export async function GET(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const auth = await requireSuperAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const path = (await ctx.params).path || [];
  const url = new URL(request.url);
  try {
    if (path[0] === 'dashboard') {
      return NextResponse.json(await getProviderDashboard((url.searchParams.get('range') as DateRangeKey) || 'last_7', url.searchParams.get('from') || undefined, url.searchParams.get('to') || undefined));
    }
    if (path[0] === 'clients' && path[1] && path[2] === undefined) {
      return NextResponse.json(await getClient(path[1]));
    }
    if (path[0] === 'clients') {
      return NextResponse.json(await listClients({ q: url.searchParams.get('q') || undefined, status: url.searchParams.get('status') || undefined, page: Number(url.searchParams.get('page') || 1) }));
    }
    if (path[0] === 'signup-config') return NextResponse.json(getPublicMetaSignupConfig());
    if (path[0] === 'templates' && path[1] !== 'library') {
      return NextResponse.json(await listTemplates({ tab: url.searchParams.get('tab') || undefined, q: url.searchParams.get('q') || undefined, clientId: url.searchParams.get('clientId') || undefined, page: Number(url.searchParams.get('page') || 1) }));
    }
    if (path[0] === 'templates' && path[1] === 'library') {
      const supabase = createAdminClient();
      const { data } = await supabase.from('wa_template_library').select('*').order('category');
      return NextResponse.json({ rows: data || [] });
    }
    if (path[0] === 'wabas') return NextResponse.json(await listTable('wa_business_accounts', ['name', 'waba_id'], request));
    if (path[0] === 'phones') return NextResponse.json(await listTable('wa_phone_numbers', ['display_phone_number', 'verified_name', 'phone_number_id'], request));
    if (path[0] === 'messages') return NextResponse.json(await listTable('wa_messages', ['wamid', 'status', 'type'], request, { client_id: url.searchParams.get('clientId') || '' }));
    if (path[0] === 'inbox') {
      const supabase = createAdminClient();
      const { data: conversations } = await supabase.from('wa_conversations').select('*, wa_contacts(name,phone)').order('last_message_at', { ascending: false }).limit(100);
      const conversationId = url.searchParams.get('conversationId');
      let messages: unknown[] = [];
      if (conversationId) {
        const result = await supabase.from('wa_messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true }).limit(200);
        messages = result.data || [];
      }
      return NextResponse.json({ conversations: conversations || [], messages });
    }
    if (path[0] === 'contacts') return NextResponse.json(await listTable('wa_contacts', ['name', 'phone', 'email'], request, { client_id: url.searchParams.get('clientId') || '' }));
    if (path[0] === 'campaigns') return NextResponse.json(await listTable('wa_campaigns', ['name', 'status'], request));
    if (path[0] === 'automations') return NextResponse.json(await listTable('wa_automations', ['name', 'trigger_type'], request));
    if (path[0] === 'flows') return NextResponse.json(await listTable('wa_flows', ['name', 'status'], request));
    if (path[0] === 'analytics') {
      return NextResponse.json(await getAnalytics({ range: (url.searchParams.get('range') as DateRangeKey) || 'this_month', from: url.searchParams.get('from') || undefined, to: url.searchParams.get('to') || undefined, clientId: url.searchParams.get('clientId') || undefined, groupBy: url.searchParams.get('groupBy') || 'client_id' }));
    }
    if (path[0] === 'quality') {
      const supabase = createAdminClient();
      const [{ data: phones }, { data: history }] = await Promise.all([
        supabase.from('wa_phone_numbers').select('*, wa_clients(name)').order('quality_rating'),
        supabase.from('wa_phone_quality_history').select('*, wa_phone_numbers(display_phone_number, client_id)').order('occurred_at', { ascending: false }).limit(50),
      ]);
      return NextResponse.json({ phones: phones || [], history: history || [] });
    }
    if (path[0] === 'alerts') return NextResponse.json(await listTable('wa_alerts', ['title', 'type', 'severity'], request));
    if (path[0] === 'webhooks') return NextResponse.json(await listTable('wa_webhook_events', ['event_type', 'event_key', 'waba_id'], request));
    if (path[0] === 'api-logs') return NextResponse.json(await listTable('wa_api_logs', ['operation', 'endpoint', 'status'], request));
    if (path[0] === 'billing') return NextResponse.json(await listTable('wa_billing_accounts', ['plan', 'invoice_status'], request));
    if (path[0] === 'support') return NextResponse.json(await listTable('wa_support_tickets', ['subject', 'category', 'status'], request));
    if (path[0] === 'audit') return NextResponse.json(await listTable('wa_audit_logs', ['action', 'resource_type'], request));
    if (path[0] === 'notifications') {
      const supabase = createAdminClient();
      const { data } = await supabase.from('wa_notifications').select('*').order('created_at', { ascending: false }).limit(40);
      return NextResponse.json({ rows: data || [] });
    }
    if (path[0] === 'search') {
      const q = url.searchParams.get('q') || '';
      const supabase = createAdminClient();
      const [clients, phones, templates, messages, campaigns, contacts] = await Promise.all([
        supabase.from('wa_clients').select('id,name,meta_business_id').or(`name.ilike.%${q}%,meta_business_id.ilike.%${q}%`).limit(8),
        supabase.from('wa_phone_numbers').select('id,display_phone_number,phone_number_id,waba_id').or(`display_phone_number.ilike.%${q}%,phone_number_id.ilike.%${q}%,waba_id.ilike.%${q}%`).limit(8),
        supabase.from('wa_templates').select('id,name,client_id').ilike('name', `%${q}%`).limit(8),
        supabase.from('wa_messages').select('id,wamid,client_id').ilike('wamid', `%${q}%`).limit(8),
        supabase.from('wa_campaigns').select('id,name,client_id').ilike('name', `%${q}%`).limit(8),
        supabase.from('wa_contacts').select('id,name,phone,client_id').or(`name.ilike.%${q}%,phone.ilike.%${q}%`).limit(8),
      ]);
      return NextResponse.json({
        clients: clients.data || [],
        phones: phones.data || [],
        templates: templates.data || [],
        messages: messages.data || [],
        campaigns: campaigns.data || [],
        contacts: contacts.data || [],
      });
    }
    if (path[0] === 'settings') {
      const cfg = getMetaProviderConfig();
      const supabase = createAdminClient();
      const [{ data: lastApi }, { data: lastWebhook }] = await Promise.all([
        supabase.from('wa_api_logs').select('created_at,status').order('created_at', { ascending: false }).limit(1),
        supabase.from('wa_webhook_events').select('created_at,received_at,processing_status').order('received_at', { ascending: false }).limit(1),
      ]);
      return NextResponse.json({
        graphVersion: cfg.graphVersion || null,
        appConfigured: Boolean(cfg.appId),
        embeddedSignup: Boolean(cfg.embeddedSignupConfigId),
        webhookConfigured: Boolean(cfg.webhookVerifyToken && cfg.webhookCallbackUrl),
        systemToken: Boolean(cfg.systemUserAccessToken),
        creditSharing: cfg.creditSharingEnabled,
        permissions: META_PERMISSIONS,
        lastApi: lastApi?.[0] || null,
        lastWebhook: lastWebhook?.[0] || null,
      });
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const auth = await requireSuperAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const path = (await ctx.params).path || [];
  const body = await parseBody(request);
  try {
    if (path[0] === 'clients' && !path[1]) {
      if (!need(auth.role, 'whatsapp.client.create')) return deny();
      return NextResponse.json(await createClient(body, auth.user.id));
    }
    if (path[0] === 'clients' && path[2] === 'sync') {
      await syncClientFromMeta(path[1], auth.user.id);
      return NextResponse.json({ ok: true });
    }
    if (path[0] === 'onboarding' && path[1] === 'start') {
      return NextResponse.json(await startOnboarding(String(body.clientId)));
    }
    if (path[0] === 'onboarding' && path[1] === 'embedded-signup') {
      if (!need(auth.role, 'whatsapp.onboarding.manage')) return deny();
      const result = await completeEmbeddedSignup({
        clientId: String(body.clientId),
        code: body.code,
        wabaId: body.wabaId,
        phoneNumberId: body.phoneNumberId,
        businessId: body.businessId,
        actorId: auth.user.id,
      });
      return NextResponse.json(result);
    }
    if (path[0] === 'templates' && !path[1]) {
      if (!need(auth.role, 'whatsapp.template.create')) return deny();
      return NextResponse.json(await saveTemplate({ ...(body as TemplateDraft), clientId: body.clientId, actorId: auth.user.id }, Boolean(body.draft ?? true)));
    }
    if (path[0] === 'templates' && path[2] === 'review') {
      if (!need(auth.role, 'whatsapp.template.internal_approve')) return deny();
      await reviewTemplate(path[1], body.decision, body.comments || '', auth.user.id);
      return NextResponse.json({ ok: true });
    }
    if (path[0] === 'templates' && path[2] === 'submit') {
      if (!need(auth.role, 'whatsapp.template.submit_meta')) return deny();
      return NextResponse.json(await submitTemplateToMeta(path[1], auth.user.id));
    }
    if (path[0] === 'templates' && path[1] === 'library' && path[2] === 'use') {
      return NextResponse.json(await cloneLibraryTemplate(String(body.libraryId), String(body.clientId), auth.user.id));
    }
    if (path[0] === 'phones' && path[2] === 'register') {
      if (!need(auth.role, 'whatsapp.phone.register')) return deny();
      const supabase = createAdminClient();
      const { data: phone } = await supabase.from('wa_phone_numbers').select('*').eq('id', path[1]).maybeSingle();
      if (!phone) return NextResponse.json({ error: 'Phone not found' }, { status: 404 });
      const token = await readClientCredential(phone.client_id, 'user_access_token');
      const service = new MetaWhatsAppService({ clientId: phone.client_id, accessToken: token?.value });
      const result = await service.registerPhoneNumber(phone.phone_number_id, String(body.pin || ''));
      await writeAuditLog({ clientId: phone.client_id, actorUserId: auth.user.id, action: 'phone.registered', resourceType: 'wa_phone', resourceId: phone.id });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    if (path[0] === 'test-message') {
      if (!need(auth.role, 'whatsapp.message.send')) return deny();
      const token = await readClientCredential(String(body.clientId), 'user_access_token');
      const service = new MetaWhatsAppService({ clientId: body.clientId, accessToken: token?.value });
      const result = await service.sendTemplateMessage(String(body.phoneNumberId), String(body.to), {
        name: body.templateName,
        language: { code: body.language || 'en' },
        components: body.components || [],
      });
      if (result.ok) {
        const supabase = createAdminClient();
        await supabase.from('wa_messages').insert({
          client_id: body.clientId,
          wamid: (result.data as { messages?: { id?: string }[] } | null)?.messages?.[0]?.id,
          direction: 'OUTBOUND',
          type: 'template',
          status: 'SENT',
          content_json: { test: true, to: body.to },
          sent_at: new Date().toISOString(),
        });
      }
      return NextResponse.json(result.ok ? { ok: true, wamid: (result.data as { messages?: { id?: string }[] })?.messages?.[0]?.id } : { error: result.error }, { status: result.ok ? 200 : 400 });
    }
    if (path[0] === 'alerts' && path[2]) {
      const supabase = createAdminClient();
      const patch: Record<string, unknown> = {};
      if (path[2] === 'acknowledge') {
        patch.status = 'ACKNOWLEDGED';
        patch.acknowledged_at = new Date().toISOString();
      }
      if (path[2] === 'resolve') {
        patch.status = 'RESOLVED';
        patch.resolved_at = new Date().toISOString();
      }
      if (path[2] === 'assign') {
        patch.status = 'ASSIGNED';
        patch.assigned_to = body.assignedTo;
      }
      if (path[2] === 'note') {
        await supabase.from('wa_alert_notes').insert({ alert_id: path[1], author_id: auth.user.id, note: body.note });
        return NextResponse.json({ ok: true });
      }
      await supabase.from('wa_alerts').update(patch).eq('id', path[1]);
      return NextResponse.json({ ok: true });
    }
    if (path[0] === 'webhooks' && path[2] === 'reprocess') {
      if (!need(auth.role, 'whatsapp.webhook.reprocess')) return deny();
      await processWebhookEvent(path[1]);
      await writeAuditLog({ actorUserId: auth.user.id, action: 'webhook.reprocessed', resourceType: 'wa_webhook_event', resourceId: path[1] });
      return NextResponse.json({ ok: true });
    }
    if (path[0] === 'webhooks' && path[2] === 'payload') {
      const supabase = createAdminClient();
      const { data } = await supabase.from('wa_webhook_events').select('payload_json,normalized_json').eq('id', path[1]).maybeSingle();
      return NextResponse.json({ raw: maskWebhookPayload(data?.payload_json), normalized: data?.normalized_json });
    }
    if (path[0] === 'inbox' && path[1] === 'reply') {
      const token = await readClientCredential(String(body.clientId), 'user_access_token');
      const service = new MetaWhatsAppService({ clientId: body.clientId, accessToken: token?.value });
      const result = await service.sendTextMessage(String(body.phoneNumberId), String(body.to), String(body.text || ''));
      return NextResponse.json(result.ok ? { ok: true } : { error: result.error }, { status: result.ok ? 200 : 400 });
    }
    if (path[0] === 'inbox' && path[1] === 'note') {
      const supabase = createAdminClient();
      await supabase.from('wa_conversation_notes').insert({ conversation_id: body.conversationId, client_id: body.clientId, author_id: auth.user.id, note: body.note });
      return NextResponse.json({ ok: true });
    }
    if (path[0] === 'contacts' && path[1] === 'import') {
      const supabase = createAdminClient();
      const rows = Array.isArray(body.rows) ? body.rows : [];
      let created = 0;
      for (const row of rows) {
        const phone = String(row.phone || '').replace(/\D/g, '');
        if (!phone || !body.clientId) continue;
        const { error } = await supabase.from('wa_contacts').upsert({ client_id: body.clientId, phone, name: row.name || null, email: row.email || null, source: 'CSV', opt_in_status: row.opt_in_status || 'UNKNOWN' }, { onConflict: 'client_id,phone' });
        if (!error) created += 1;
      }
      return NextResponse.json({ created });
    }
    if (path[0] === 'campaigns') {
      const supabase = createAdminClient();
      const { data, error } = await supabase.from('wa_campaigns').insert({ ...body, created_by: auth.user.id, status: body.status || 'DRAFT' }).select('*').single();
      if (error) throw new Error(error.message);
      return NextResponse.json(data);
    }
    if (path[0] === 'automations') {
      const supabase = createAdminClient();
      const { data, error } = await supabase.from('wa_automations').insert(body).select('*').single();
      if (error) throw new Error(error.message);
      return NextResponse.json(data);
    }
    if (path[0] === 'support') {
      const supabase = createAdminClient();
      const { data, error } = await supabase.from('wa_support_tickets').insert(body).select('*').single();
      if (error) throw new Error(error.message);
      return NextResponse.json(data);
    }
    if (path[0] === 'health') {
      const service = new MetaWhatsAppService();
      return NextResponse.json(await service.healthCheck(body.wabaId));
    }
    if (path[0] === 'seed') {
      return NextResponse.json(await seedDemoProviderData());
    }
    if (path[0] === 'export') {
      if (!need(auth.role, 'whatsapp.export')) return deny();
      const supabase = createAdminClient();
      const table = String(body.table || 'wa_clients');
      const allowed = ['wa_clients', 'wa_templates', 'wa_messages', 'wa_campaigns', 'wa_billing_accounts', 'wa_api_logs', 'wa_webhook_events'];
      if (!allowed.includes(table)) return NextResponse.json({ error: 'Unsupported export' }, { status: 400 });
      const { data } = await supabase.from(table).select('*').limit(2000);
      return NextResponse.json({ rows: data || [] });
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}

export async function PATCH(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const auth = await requireSuperAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const path = (await ctx.params).path || [];
  const body = await parseBody(request);
  try {
    if (path[0] === 'clients' && path[1] && !path[2]) {
      if (!need(auth.role, 'whatsapp.client.update')) return deny();
      return NextResponse.json(await updateClient(path[1], body, auth.user.id));
    }
    if (path[0] === 'clients' && path[2] === 'status') {
      if (!need(auth.role, 'whatsapp.client.disable')) return deny();
      await setClientStatus(path[1], String(body.status), auth.user.id);
      return NextResponse.json({ ok: true });
    }
    if (path[0] === 'billing' && path[1]) {
      if (!need(auth.role, 'whatsapp.billing.update')) return deny();
      const supabase = createAdminClient();
      const { data, error } = await supabase.from('wa_billing_accounts').update(body).eq('id', path[1]).select('*').single();
      if (error) throw new Error(error.message);
      await writeAuditLog({ actorUserId: auth.user.id, action: 'billing.changed', resourceType: 'wa_billing', resourceId: path[1] });
      return NextResponse.json(data);
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}

export async function DELETE(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const auth = await requireSuperAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const path = (await ctx.params).path || [];
  try {
    if (path[0] === 'templates' && path[1]) {
      if (!need(auth.role, 'whatsapp.template.delete')) return deny();
      const supabase = createAdminClient();
      const { data } = await supabase.from('wa_templates').select('client_id,waba_id,name,meta_template_id').eq('id', path[1]).maybeSingle();
      if (data?.waba_id && data.meta_template_id) {
        const token = await readClientCredential(data.client_id, 'user_access_token');
        const service = new MetaWhatsAppService({ clientId: data.client_id, accessToken: token?.value });
        await service.deleteTemplate(data.waba_id, data.name, data.meta_template_id);
      }
      await supabase.from('wa_templates').update({ internal_status: 'DELETED' }).eq('id', path[1]);
      await writeAuditLog({ clientId: data?.client_id, actorUserId: auth.user.id, action: 'template.deleted', resourceType: 'wa_template', resourceId: path[1] });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
