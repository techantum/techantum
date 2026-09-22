import { createAdminClient } from '@/lib/supabase/admin';
import { getMetaProviderConfig, ONBOARDING_STEPS } from '../config';
import { writeAuditLog, notify, createAlert } from '../audit';
import { readClientCredential } from '../credentials';
import { MetaWhatsAppService } from '../meta/service';
import { refreshClientHealth, upsertPhoneFromMeta, upsertTemplateFromMeta, upsertWabaFromMeta } from './clients';

function defaultSteps() {
  return ONBOARDING_STEPS.map((label, index) => ({
    step: index + 1,
    label,
    status: index === 0 ? 'COMPLETED' : 'PENDING',
  }));
}

export async function startOnboarding(clientId: string) {
  const supabase = createAdminClient();
  const existing = await supabase.from('wa_onboarding_sessions').select('*').eq('client_id', clientId).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (existing.data) return existing.data;
  const { data, error } = await supabase
    .from('wa_onboarding_sessions')
    .insert({ client_id: clientId, current_step: 2, steps_json: defaultSteps(), status: 'IN_PROGRESS' })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function logOnboardingEvent(sessionId: string, clientId: string, step: number, event: string, status: string, detail: Record<string, unknown> = {}) {
  const supabase = createAdminClient();
  await supabase.from('wa_onboarding_events').insert({ session_id: sessionId, client_id: clientId, step, event, status, detail_json: detail });
}

export async function completeEmbeddedSignup(input: {
  clientId: string;
  code?: string;
  accessToken?: string;
  wabaId?: string;
  phoneNumberId?: string;
  businessId?: string;
  actorId?: string;
}) {
  const supabase = createAdminClient();
  const session = await startOnboarding(input.clientId);
  const service = new MetaWhatsAppService({ clientId: input.clientId });

  try {
    if (input.accessToken) {
      await service.persistClientToken(input.clientId, input.accessToken);
      await logOnboardingEvent(session.id, input.clientId, 3, 'store_token', 'COMPLETED', {});
    } else if (input.code) {
      if (!getMetaProviderConfig().appSecret) {
        throw new Error('Meta returned an Embedded Signup code. Add META_APP_SECRET on the server so TechAntum can exchange it and import the WABA.');
      }
      const exchanged = await service.exchangeAuthorizationCode(input.code);
      if (!exchanged.ok || !exchanged.data?.access_token) {
        await logOnboardingEvent(session.id, input.clientId, 3, 'exchange_code', 'FAILED', { error: exchanged.error });
        throw new Error(exchanged.error?.userMessage || 'Authorization code exchange failed.');
      }
      await service.persistClientToken(input.clientId, exchanged.data.access_token, exchanged.data.expires_in);
      await logOnboardingEvent(session.id, input.clientId, 3, 'exchange_code', 'COMPLETED', {});
    }

    const token = await readClientCredential(input.clientId, 'user_access_token');
    const authed = new MetaWhatsAppService({ clientId: input.clientId, accessToken: token?.value });
    const discovered = await authed.discoverSignupAssets({
      businessId: input.businessId,
      wabaId: input.wabaId,
      phoneNumberId: input.phoneNumberId,
    });
    const businessId = discovered.businessId || input.businessId;
    const wabaId = discovered.wabaId || input.wabaId;
    const phoneNumberId = discovered.phoneNumberId || input.phoneNumberId;

    if (businessId) {
      await supabase.from('wa_clients').update({ meta_business_id: businessId, meta_connection_status: 'CONNECTED' }).eq('id', input.clientId);
      await logOnboardingEvent(session.id, input.clientId, 4, 'save_business', 'COMPLETED', { businessId });
    }

    let wabaRow = null;
    if (wabaId) {
      const waba = await authed.getWaba(wabaId);
      wabaRow = await upsertWabaFromMeta(input.clientId, { ...(waba.data || {}), id: wabaId, meta_business_id: businessId });
      await logOnboardingEvent(session.id, input.clientId, 5, 'save_waba', 'COMPLETED', { wabaId });
    }

    if (phoneNumberId && wabaId) {
      const phone = await authed.getPhoneNumber(phoneNumberId);
      await upsertPhoneFromMeta(input.clientId, wabaRow?.id || null, wabaId, { ...(phone.data || {}), id: phoneNumberId });
      await logOnboardingEvent(session.id, input.clientId, 6, 'save_phone', 'COMPLETED', { phoneNumberId });
    }

    if (wabaId) {
      const subscribed = await authed.subscribeWaba(wabaId);
      await supabase.from('wa_business_accounts').update({ webhook_subscribed: subscribed.ok }).eq('waba_id', wabaId);
      await logOnboardingEvent(session.id, input.clientId, 10, 'subscribe_webhooks', subscribed.ok ? 'COMPLETED' : 'FAILED', { error: subscribed.error });

      const templates = await authed.getTemplates(wabaId);
      for (const template of templates.data || []) {
        await upsertTemplateFromMeta(input.clientId, wabaRow?.id || null, wabaId, template as Record<string, unknown>);
      }
      await logOnboardingEvent(session.id, input.clientId, 11, 'sync_templates', 'COMPLETED', { count: templates.data?.length || 0 });

      const health = await authed.healthCheck(wabaId);
      await logOnboardingEvent(session.id, input.clientId, 12, 'health_check', 'COMPLETED', health as Record<string, unknown>);
    }

    if (!wabaId) {
      throw new Error('WhatsApp account was authorized, but no WABA was returned. Please retry Connect WhatsApp.');
    }

    await supabase
      .from('wa_clients')
      .update({
        onboarding_status: 'COMPLETED',
        status: 'ACTIVE',
        meta_connection_status: 'CONNECTED',
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', input.clientId);
    await supabase.from('wa_onboarding_sessions').update({ status: 'COMPLETED', current_step: 13 }).eq('id', session.id);
    await refreshClientHealth(input.clientId);
    await writeAuditLog({
      clientId: input.clientId,
      actorUserId: input.actorId,
      action: 'client.connected',
      resourceType: 'wa_client',
      resourceId: input.clientId,
      newValues: { wabaId, phoneNumberId, businessId },
    });
    await notify({ clientId: input.clientId, type: 'onboarding.completed', title: 'Client onboarding completed' });
    return { ok: true, wabaId, phoneNumberId, businessId };
  } catch (err) {
    await logOnboardingEvent(session.id, input.clientId, 3, 'embedded_signup', 'FAILED', { error: err instanceof Error ? err.message : 'Failed' });
    await createAlert({
      clientId: input.clientId,
      type: 'CLIENT_ONBOARDING_FAILED',
      severity: 'CRITICAL',
      title: 'Client onboarding failed',
      description: err instanceof Error ? err.message : 'Embedded Signup failed',
    });
    throw err;
  }
}
