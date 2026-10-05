import { createAdminClient } from '@/lib/supabase/admin';
import { computeOnboardingSetup } from '../onboarding-state';
import { readClientCredential } from '../credentials';
import { getAnalytics } from './dashboard';
import { refreshPortalFromMeta } from './onboarding';
import { getPortalWhatsAppAssets, getSelfServeSession } from './self-onboard';
import { resolveMetaPhoneState } from '../phone-status';
import type { DateRangeKey } from '../types';

export async function refreshPortalIfStale(clientId: string, actorId?: string, maxAgeMs = 60_000) {
  const supabase = createAdminClient();
  const { data } = await supabase.from('wa_clients').select('last_synced_at').eq('id', clientId).maybeSingle();
  const synced = data?.last_synced_at ? new Date(data.last_synced_at).getTime() : 0;
  if (Number.isFinite(synced) && Date.now() - synced < maxAgeMs) return false;
  try {
    await refreshPortalFromMeta(clientId, actorId);
    return true;
  } catch {
    return false;
  }
}

export async function getPortalWorkspace(clientId: string, userId?: string, range: DateRangeKey = 'this_month') {
  await refreshPortalIfStale(clientId, userId);
  const supabase = createAdminClient();
  const [{ data: client }, analytics, assets, token, session] = await Promise.all([
    supabase.from('wa_clients').select('id,name,email,platform_health,onboarding_status,meta_connection_status,meta_business_id').eq('id', clientId).maybeSingle(),
    getAnalytics({ range, clientId }),
    getPortalWhatsAppAssets(clientId),
    readClientCredential(clientId, 'user_access_token'),
    userId ? getSelfServeSession(userId) : Promise.resolve(null),
  ]);
  const setup = computeOnboardingSetup({
    hasToken: Boolean(token?.value),
    businessId: client?.meta_business_id || session?.metaBusinessId,
    wabas: assets.wabas,
    phones: assets.phones,
    templateCount: assets.templateCount,
  });
  const [templatesRes, eventsRes, messagesRes] = await Promise.all([
    supabase
      .from('wa_templates')
      .select('id,name,category,language,internal_status,meta_status,quality_status,body,updated_at,rejection_reason')
      .eq('client_id', clientId)
      .order('updated_at', { ascending: false })
      .limit(12),
    supabase
      .from('wa_onboarding_events')
      .select('event,status,created_at,detail_json')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('wa_messages')
      .select('id,wamid,direction,type,status,created_at,sent_at,delivered_at,read_at,content_json,wa_contacts(name,phone),wa_phone_numbers(display_phone_number,verified_name),wa_templates(name,category,language)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);
  const templates = templatesRes.data;
  const events = eventsRes.data;
  const messages = messagesRes.error
    ? (
        await supabase
          .from('wa_messages')
          .select('id,wamid,direction,type,status,created_at,sent_at,delivered_at,read_at,content_json')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(50)
      ).data
    : messagesRes.data;

  const phones = assets.phones || [];
  const phoneViews = phones.map((p) => resolveMetaPhoneState(p as Record<string, unknown>));
  const active = phoneViews.filter((p) => p.key === 'CONNECTED').length;
  const review = phoneViews.filter((p) => p.key === 'IN_REVIEW').length;
  const expired = phoneViews.filter((p) => p.key === 'EXPIRED' || p.key === 'DISCONNECTED' || p.key === 'RESTRICTED').length;

  return {
    client,
    session,
    analytics,
    setup,
    phones,
    phoneStats: { total: phones.length, active, review, expired },
    templates: templates || [],
    templateCount: assets.templateCount,
    activity: events || [],
    messages: (messages || []).map(mapPortalMessage),
  };
}

export async function listPortalMessages(clientId: string, limit = 80) {
  const supabase = createAdminClient();
  const joined = await supabase
    .from('wa_messages')
    .select('id,wamid,direction,type,status,created_at,sent_at,delivered_at,read_at,failed_at,content_json,error_message,wa_contacts(name,phone),wa_phone_numbers(display_phone_number,verified_name),wa_templates(name,category,language)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (!joined.error) return { rows: (joined.data || []).map(mapPortalMessage) };
  const { data, error } = await supabase
    .from('wa_messages')
    .select('id,wamid,direction,type,status,created_at,sent_at,delivered_at,read_at,failed_at,content_json,error_message')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return { rows: (data || []).map(mapPortalMessage) };
}

function firstRel(value: unknown) {
  if (Array.isArray(value)) return (value[0] || {}) as Record<string, any>;
  return (value || {}) as Record<string, any>;
}

function mapPortalMessage(row: Record<string, any>) {
  const content = row.content_json || {};
  const template = firstRel(row.wa_templates);
  const text = String(content.body || content.text?.body || content.caption || template.name || row.type || '');
  const contact = firstRel(row.wa_contacts);
  const phone = firstRel(row.wa_phone_numbers);
  return {
    id: row.id,
    wamid: row.wamid,
    preview: text,
    type: row.type,
    direction: row.direction,
    status: row.status,
    created_at: row.created_at,
    sent_at: row.sent_at,
    delivered_at: row.delivered_at,
    read_at: row.read_at,
    failed_at: row.failed_at,
    error_message: row.error_message,
    contact_name: contact.name || '',
    contact_phone: contact.phone || '',
    whatsapp_number: phone.display_phone_number || '',
    verified_name: phone.verified_name || '',
    template_name: template.name || '',
    template_category: template.category || '',
    template_language: template.language || '',
  };
}
