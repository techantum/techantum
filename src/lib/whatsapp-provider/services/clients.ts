import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '../audit';
import { scorePlatformHealth } from '../health';
import { MetaWhatsAppService } from '../meta/service';
import { readClientCredential } from '../credentials';
import { mapMetaTemplateStatus } from '../template-validation';

export async function listClients(filters: { q?: string; status?: string; page?: number; pageSize?: number }) {
  const supabase = createAdminClient();
  const page = Math.max(filters.page || 1, 1);
  const pageSize = Math.min(filters.pageSize || 25, 100);
  const from = (page - 1) * pageSize;
  let query = supabase.from('wa_clients').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, from + pageSize - 1);
  if (filters.status && filters.status !== 'ALL') {
    if (filters.status === 'ATTENTION') query = query.in('status', ['ATTENTION']).or('platform_health.in.(ATTENTION,CRITICAL)');
    else query = query.eq('status', filters.status);
  }
  if (filters.q) {
    const q = filters.q.trim();
    query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,meta_business_id.ilike.%${q}%`);
  }
  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  const ids = (data || []).map((row) => row.id);
  const extras = ids.length ? await loadClientExtras(ids) : { wabas: {}, phones: {}, messages: {} };
  return {
    rows: (data || []).map((row) => ({
      ...row,
      waba_count: extras.wabas[row.id] || 0,
      phone_count: extras.phones[row.id] || 0,
      messages_this_month: extras.messages[row.id] || 0,
    })),
    total: count || 0,
    page,
    pageSize,
  };
}

async function loadClientExtras(ids: string[]) {
  const supabase = createAdminClient();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const [{ data: wabas }, { data: phones }, { data: messages }] = await Promise.all([
    supabase.from('wa_business_accounts').select('client_id').in('client_id', ids),
    supabase.from('wa_phone_numbers').select('client_id').in('client_id', ids),
    supabase.from('wa_messages').select('client_id').in('client_id', ids).gte('created_at', monthStart),
  ]);
  const countBy = (rows: { client_id: string }[] | null) =>
    (rows || []).reduce<Record<string, number>>((acc, row) => {
      acc[row.client_id] = (acc[row.client_id] || 0) + 1;
      return acc;
    }, {});
  return { wabas: countBy(wabas), phones: countBy(phones), messages: countBy(messages) };
}

export async function getClient(id: string) {
  const supabase = createAdminClient();
  const { data: client, error } = await supabase.from('wa_clients').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!client) return null;
  const [wabas, phones, templates, billing, stats] = await Promise.all([
    supabase.from('wa_business_accounts').select('*').eq('client_id', id),
    supabase.from('wa_phone_numbers').select('*').eq('client_id', id),
    supabase.from('wa_templates').select('id,internal_status,meta_status').eq('client_id', id),
    supabase.from('wa_billing_accounts').select('*').eq('client_id', id).maybeSingle(),
    monthStats(id),
  ]);
  return {
    client,
    wabas: wabas.data || [],
    phones: phones.data || [],
    templates: templates.data || [],
    billing: billing.data,
    stats,
  };
}

async function monthStats(clientId: string) {
  const supabase = createAdminClient();
  const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const { data } = await supabase.from('wa_messages').select('status,direction').eq('client_id', clientId).gte('created_at', start);
  const rows = data || [];
  return {
    sent: rows.filter((r) => ['SENT', 'DELIVERED', 'READ'].includes(r.status)).length,
    delivered: rows.filter((r) => ['DELIVERED', 'READ'].includes(r.status)).length,
    read: rows.filter((r) => r.status === 'READ').length,
    failed: rows.filter((r) => r.status === 'FAILED').length,
    inbound: rows.filter((r) => r.direction === 'INBOUND').length,
  };
}

export async function createClient(input: Record<string, unknown>, actorId?: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('wa_clients')
    .insert({
      name: String(input.name || '').trim(),
      legal_name: input.legal_name || null,
      contact_name: input.contact_name || null,
      email: input.email || null,
      phone: input.phone || null,
      logo_url: input.logo_url || null,
      status: 'ONBOARDING',
      onboarding_status: 'CLIENT_CREATED',
      assigned_manager_id: input.assigned_manager_id || actorId || null,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  await supabase.from('wa_billing_accounts').insert({ client_id: data.id, plan: 'BASIC' });
  await writeAuditLog({ clientId: data.id, actorUserId: actorId, action: 'client.created', resourceType: 'wa_client', resourceId: data.id, newValues: { name: data.name } });
  return data;
}

export async function updateClient(id: string, input: Record<string, unknown>, actorId?: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('wa_clients')
    .update({
      name: input.name,
      legal_name: input.legal_name,
      contact_name: input.contact_name,
      email: input.email,
      phone: input.phone,
      logo_url: input.logo_url,
      assigned_manager_id: input.assigned_manager_id,
      status: input.status,
      notes: input.notes,
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  await writeAuditLog({ clientId: id, actorUserId: actorId, action: 'client.updated', resourceType: 'wa_client', resourceId: id, newValues: input });
  return data;
}

export async function setClientStatus(id: string, status: string, actorId?: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('wa_clients').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
  await writeAuditLog({ clientId: id, actorUserId: actorId, action: status === 'ARCHIVED' ? 'client.archived' : 'client.disabled', resourceType: 'wa_client', resourceId: id, newValues: { status } });
}

export async function refreshClientHealth(clientId: string) {
  const supabase = createAdminClient();
  const [{ data: client }, { data: phones }, { data: wabas }, { data: templates }, { data: messages }, { data: webhooks }] = await Promise.all([
    supabase.from('wa_clients').select('*').eq('id', clientId).maybeSingle(),
    supabase.from('wa_phone_numbers').select('quality_rating').eq('client_id', clientId),
    supabase.from('wa_business_accounts').select('account_status,webhook_subscribed,last_synced_at').eq('client_id', clientId),
    supabase.from('wa_templates').select('internal_status').eq('client_id', clientId),
    supabase.from('wa_messages').select('status').eq('client_id', clientId).gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
    supabase.from('wa_webhook_events').select('processing_status').eq('client_id', clientId).gte('received_at', new Date(Date.now() - 7 * 86400000).toISOString()),
  ]);
  const token = await readClientCredential(clientId, 'user_access_token').catch(() => null);
  const sent = (messages || []).filter((m) => ['SENT', 'DELIVERED', 'READ', 'FAILED'].includes(m.status));
  const failed = sent.filter((m) => m.status === 'FAILED').length;
  const rejected = (templates || []).filter((t) => t.internal_status === 'META_REJECTED').length;
  const lastSync = (wabas || []).map((w) => w.last_synced_at).filter(Boolean).sort().at(-1);
  const result = scorePlatformHealth({
    metaConnected: client?.meta_connection_status === 'CONNECTED',
    tokenValid: Boolean(token?.value),
    phoneQuality: phones?.[0]?.quality_rating,
    wabaStatus: wabas?.[0]?.account_status,
    webhookHealthy: (webhooks || []).filter((w) => w.processing_status === 'FAILED').length < 3,
    failureRate: sent.length ? failed / sent.length : 0,
    templateRejectionRate: templates?.length ? rejected / templates.length : 0,
    lastSyncAgeHours: lastSync ? (Date.now() - new Date(lastSync).getTime()) / 3600000 : null,
  });
  await supabase
    .from('wa_clients')
    .update({ platform_health: result.health, platform_health_reasons: result.reasons, status: result.health === 'CRITICAL' ? 'ATTENTION' : client?.status })
    .eq('id', clientId);
  return result;
}

export async function upsertWabaFromMeta(clientId: string, waba: Record<string, unknown>) {
  const supabase = createAdminClient();
  const wabaId = String(waba.id || waba.waba_id || '');
  if (!wabaId) throw new Error('Missing WABA ID');
  const { data, error } = await supabase
    .from('wa_business_accounts')
    .upsert(
      {
        client_id: clientId,
        meta_business_id: String(waba.meta_business_id || waba.owner_business_id || ''),
        waba_id: wabaId,
        name: waba.name || null,
        currency: waba.currency || null,
        timezone: waba.timezone || null,
        account_status: waba.account_review_status || waba.account_status || null,
        verification_status: waba.business_verification_status || null,
        last_synced_at: new Date().toISOString(),
        raw_json: waba,
      },
      { onConflict: 'waba_id' }
    )
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function upsertPhoneFromMeta(clientId: string, wabaAccountId: string | null, wabaId: string, phone: Record<string, unknown>) {
  const supabase = createAdminClient();
  const phoneNumberId = String(phone.id || phone.phone_number_id || '');
  if (!phoneNumberId) throw new Error('Missing phone number ID');
  const { data: existing } = await supabase.from('wa_phone_numbers').select('*').eq('phone_number_id', phoneNumberId).maybeSingle();
  const quality = String(phone.quality_rating || 'UNKNOWN').toUpperCase();
  const { data, error } = await supabase
    .from('wa_phone_numbers')
    .upsert(
      {
        client_id: clientId,
        waba_account_id: wabaAccountId,
        waba_id: wabaId,
        phone_number_id: phoneNumberId,
        display_phone_number: phone.display_phone_number || null,
        verified_name: phone.verified_name || null,
        registration_status: phone.code_verification_status || phone.status || null,
        quality_rating: quality,
        messaging_status: phone.messaging_limit_tier || phone.status || null,
        last_synced_at: new Date().toISOString(),
        raw_json: phone,
      },
      { onConflict: 'phone_number_id' }
    )
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  if (existing && existing.quality_rating !== quality) {
    await supabase.from('wa_phone_quality_history').insert({
      phone_number_id: data.id,
      previous_quality: existing.quality_rating,
      new_quality: quality,
      event: 'SYNC',
      occurred_at: new Date().toISOString(),
    });
  }
  return data;
}

export async function upsertTemplateFromMeta(clientId: string, wabaAccountId: string | null, wabaId: string, template: Record<string, unknown>) {
  const supabase = createAdminClient();
  const components = (template.components as Record<string, unknown>[]) || [];
  const body = components.find((c) => String(c.type).toUpperCase() === 'BODY');
  const header = components.find((c) => String(c.type).toUpperCase() === 'HEADER');
  const footer = components.find((c) => String(c.type).toUpperCase() === 'FOOTER');
  const buttons = components.find((c) => String(c.type).toUpperCase() === 'BUTTONS');
  const metaStatus = String(template.status || 'PENDING').toUpperCase();
  const { data: existing } = await supabase
    .from('wa_templates')
    .select('id')
    .eq('client_id', clientId)
    .eq('name', String(template.name || ''))
    .eq('language', String(template.language || 'en'))
    .maybeSingle();
  const row = {
    client_id: clientId,
    waba_account_id: wabaAccountId,
    waba_id: wabaId,
    meta_template_id: template.id || null,
    name: template.name,
    category: template.category || null,
    language: template.language || 'en',
    header_type: header?.format || null,
    header_content: header?.text || null,
    body: body?.text || '',
    footer: footer?.text || null,
    components_json: components,
    buttons_json: buttons?.buttons || [],
    internal_status: mapMetaTemplateStatus(metaStatus),
    meta_status: metaStatus,
    quality_status: (template.quality_score as { score?: string })?.score || null,
    rejection_reason: template.rejected_reason || null,
  };
  if (existing?.id) {
    await supabase.from('wa_templates').update(row).eq('id', existing.id);
    return existing.id;
  }
  const inserted = await supabase.from('wa_templates').insert(row).select('id').single();
  return inserted.data?.id;
}

export async function syncClientFromMeta(clientId: string, actorId?: string) {
  const token = await readClientCredential(clientId, 'user_access_token');
  const service = new MetaWhatsAppService({ clientId, accessToken: token?.value });
  const supabase = createAdminClient();
  const { data: wabas } = await supabase.from('wa_business_accounts').select('*').eq('client_id', clientId);
  for (const waba of wabas || []) {
    const remote = await service.getWaba(waba.waba_id);
    if (remote.ok && remote.data) await upsertWabaFromMeta(clientId, { ...remote.data, meta_business_id: waba.meta_business_id });
    const phones = await service.getPhoneNumbers(waba.waba_id);
    for (const phone of phones.data || []) {
      await upsertPhoneFromMeta(clientId, waba.id, waba.waba_id, phone as Record<string, unknown>);
    }
    const templates = await service.getTemplates(waba.waba_id);
    for (const template of templates.data || []) {
      await upsertTemplateFromMeta(clientId, waba.id, waba.waba_id, template as Record<string, unknown>);
    }
    await supabase.from('wa_business_accounts').update({ last_synced_at: new Date().toISOString() }).eq('id', waba.id);
  }
  await supabase.from('wa_clients').update({ last_synced_at: new Date().toISOString(), last_api_activity_at: new Date().toISOString() }).eq('id', clientId);
  await refreshClientHealth(clientId);
  await writeAuditLog({ clientId, actorUserId: actorId, action: 'client.synced', resourceType: 'wa_client', resourceId: clientId });
}
