import { createAdminClient } from '@/lib/supabase/admin';
import { getMetaProviderConfig, ONBOARDING_STEPS } from '../config';
import { writeAuditLog, notify, createAlert } from '../audit';
import { readClientCredential } from '../credentials';
import { MetaWhatsAppService } from '../meta/service';
import { refreshClientHealth, syncClientFromMeta, upsertPhoneFromMeta, upsertTemplateFromMeta, upsertWabaFromMeta } from './clients';
import { computeOnboardingSetup } from '../onboarding-state';
import { getPortalWhatsAppAssets } from './self-onboard';

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

async function resolveUserAccessToken(input: {
  clientId: string;
  code?: string;
  accessToken?: string;
  source?: 'sdk' | 'redirect';
}) {
  const service = new MetaWhatsAppService({ clientId: input.clientId, requireUserToken: true });
  if (input.accessToken) {
    await service.persistClientToken(input.clientId, input.accessToken);
    return input.accessToken;
  }
  if (!input.code) {
    const stored = await readClientCredential(input.clientId, 'user_access_token');
    if (stored?.value) return stored.value;
    throw new Error('Meta did not return an authorization code. Please connect Facebook again.');
  }
  if (!getMetaProviderConfig().appSecret) {
    throw new Error('Meta returned an Embedded Signup code. Add META_APP_SECRET on the server so Techantum can exchange it and import the WhatsApp account.');
  }
  const exchanged = await service.exchangeAuthorizationCode(input.code, {
    redirectUri: input.source === 'sdk' ? null : undefined,
  });
  if (!exchanged.ok || !exchanged.data?.access_token) {
    throw new Error(exchanged.error?.userMessage || 'Could not exchange the Meta authorization code.');
  }
  await service.persistClientToken(input.clientId, exchanged.data.access_token, exchanged.data.expires_in);
  return exchanged.data.access_token;
}

async function applyMetaProfile(clientId: string, service: MetaWhatsAppService, input: {
  businessId?: string;
  waba?: Record<string, unknown> | null;
  phoneNumberId?: string;
}) {
  const supabase = createAdminClient();
  const updates: Record<string, unknown> = {};
  if (input.businessId) {
    const business = await service.getBusiness(input.businessId);
    if (business.ok && business.data) {
      const name = String((business.data as { name?: string }).name || '');
      updates.meta_business_id = input.businessId;
      if (name) {
        updates.legal_name = name;
        updates.name = updates.name || name;
      }
    }
  }
  if (input.waba?.name) updates.name = input.waba.name;
  if (input.phoneNumberId) {
    const profile = await service.getBusinessProfile(input.phoneNumberId);
    const row = ((profile.data as { data?: Array<Record<string, unknown>> } | null)?.data?.[0] || profile.data || {}) as Record<string, unknown>;
    const websites = Array.isArray(row.websites) ? row.websites : [];
    if (row.email) updates.email = row.email;
    if (row.address) updates.address = row.address;
    if (row.vertical) updates.business_category = row.vertical;
    if (websites[0]) updates.website = websites[0];
  }
  if (Object.keys(updates).length) {
    await supabase.from('wa_clients').update(updates).eq('id', clientId);
  }
}

export async function importMetaWorkspace(input: {
  clientId: string;
  code?: string;
  accessToken?: string;
  wabaId?: string;
  phoneNumberId?: string;
  businessId?: string;
  actorId?: string;
  mode?: 'new' | 'existing';
  source?: 'sdk' | 'redirect';
}) {
  const supabase = createAdminClient();
  const session = await startOnboarding(input.clientId);
  const mode = input.mode === 'existing' ? 'existing' : 'new';

  try {
    const accessToken = await resolveUserAccessToken(input);
    await logOnboardingEvent(session.id, input.clientId, 3, 'store_token', 'COMPLETED', { source: input.source || 'unknown', mode });

    const authed = new MetaWhatsAppService({ clientId: input.clientId, accessToken, requireUserToken: true });
    const discovered = await authed.discoverSignupAssets({
      businessId: input.businessId,
      wabaId: input.wabaId,
      phoneNumberId: input.phoneNumberId,
    });
    const businessId = discovered.businessId || input.businessId;
    const wabaCandidates = discovered.wabas.length
      ? discovered.wabas
      : discovered.wabaId
        ? [{ id: discovered.wabaId, business_id: businessId }]
        : [];
    const selectedWabaId = discovered.wabaId || input.wabaId || String(wabaCandidates[0]?.id || '');

    if (!selectedWabaId) {
      await supabase.from('wa_clients').update({
        meta_business_id: businessId || null,
        meta_connection_status: 'AUTHORIZED',
        onboarding_status: 'CLIENT_CREATED',
      }).eq('id', input.clientId);
      throw new Error(
        mode === 'existing'
          ? 'Facebook connected, but no WhatsApp Business Account was found on that profile. Choose the Facebook account that already owns the WABA.'
          : 'Facebook connected, but Meta did not create a WhatsApp Business Account. Finish the Meta setup screens, then try again.',
      );
    }

    let primaryWaba: Record<string, unknown> | null = null;
    let primaryPhoneId = discovered.phoneNumberId || input.phoneNumberId || '';
    let phoneCount = 0;
    let templateCount = 0;

    for (const candidate of wabaCandidates.length ? wabaCandidates : [{ id: selectedWabaId, business_id: businessId }]) {
      const wabaId = String(candidate.id || '');
      if (!wabaId) continue;
      const remote = await authed.getWaba(wabaId);
      if (!remote.ok || !remote.data) {
        await logOnboardingEvent(session.id, input.clientId, 5, 'save_waba', 'FAILED', { wabaId, error: remote.error });
        continue;
      }
      const wabaRow = await upsertWabaFromMeta(input.clientId, {
        ...(remote.data as Record<string, unknown>),
        id: wabaId,
        meta_business_id: candidate.business_id || businessId,
      });
      if (wabaId === selectedWabaId) primaryWaba = { ...(remote.data as Record<string, unknown>), id: wabaId };

      const subscribed = await authed.subscribeWaba(wabaId);
      if (!subscribed.ok) {
        const fallback = new MetaWhatsAppService({ clientId: input.clientId });
        const retry = await fallback.subscribeWaba(wabaId);
        await supabase.from('wa_business_accounts').update({ webhook_subscribed: retry.ok }).eq('waba_id', wabaId);
        await logOnboardingEvent(session.id, input.clientId, 10, 'subscribe_webhooks', retry.ok ? 'COMPLETED' : 'FAILED', { wabaId, error: retry.error || subscribed.error });
      } else {
        await supabase.from('wa_business_accounts').update({ webhook_subscribed: true }).eq('waba_id', wabaId);
        await logOnboardingEvent(session.id, input.clientId, 10, 'subscribe_webhooks', 'COMPLETED', { wabaId });
      }

      const phones = await authed.getPhoneNumbers(wabaId);
      const discoveredPhones = (discovered.phones || []).filter((phone) => !phone.waba_id || String(phone.waba_id) === wabaId);
      const phoneRows = [...(phones.data || []), ...discoveredPhones];
      const seenPhones = new Set<string>();
      for (const phone of phoneRows) {
        const id = String((phone as { id?: string }).id || '');
        if (!id || seenPhones.has(id)) continue;
        seenPhones.add(id);
        await upsertPhoneFromMeta(input.clientId, wabaRow?.id || null, wabaId, phone as Record<string, unknown>);
        phoneCount += 1;
        if (!primaryPhoneId) primaryPhoneId = id;
      }

      const templates = await authed.getTemplates(wabaId);
      for (const template of templates.data || []) {
        await upsertTemplateFromMeta(input.clientId, wabaRow?.id || null, wabaId, template as Record<string, unknown>);
        templateCount += 1;
      }
    }

    if (!primaryWaba) {
      throw new Error('Meta returned a WhatsApp account id, but Techantum could not read it. Reconnect Facebook and try again.');
    }

    await applyMetaProfile(input.clientId, authed, {
      businessId,
      waba: primaryWaba,
      phoneNumberId: primaryPhoneId,
    });

    const assets = await getPortalWhatsAppAssets(input.clientId);
    const setup = computeOnboardingSetup({
      hasToken: true,
      businessId,
      wabas: assets.wabas,
      phones: assets.phones,
      templateCount: assets.templateCount,
    });

    await supabase.from('wa_clients').update({
      meta_business_id: businessId || null,
      meta_connection_status: setup.connectionStatus,
      onboarding_status: setup.ready ? 'COMPLETED' : 'CLIENT_CREATED',
      status: setup.ready ? 'ACTIVE' : 'ONBOARDING',
      last_synced_at: new Date().toISOString(),
    }).eq('id', input.clientId);

    if (setup.ready) {
      await supabase.from('wa_onboarding_sessions').update({ status: 'COMPLETED', current_step: 13 }).eq('id', session.id);
    } else {
      await supabase.from('wa_onboarding_sessions').update({ status: 'IN_PROGRESS', current_step: setup.hasPhone ? 12 : 6 }).eq('id', session.id);
    }

    await refreshClientHealth(input.clientId);
    await writeAuditLog({
      clientId: input.clientId,
      actorUserId: input.actorId,
      action: setup.ready ? 'client.connected' : 'client.waba_linked',
      resourceType: 'wa_client',
      resourceId: input.clientId,
      newValues: { wabaId: selectedWabaId, phoneNumberId: primaryPhoneId, businessId, phoneCount, templateCount },
    });
    if (setup.ready) {
      await notify({ clientId: input.clientId, type: 'onboarding.completed', title: 'WhatsApp Business API connected from Meta' });
    }

    return {
      ok: true,
      ready: setup.ready,
      connectionStatus: setup.connectionStatus,
      wabaId: selectedWabaId,
      phoneNumberId: primaryPhoneId,
      businessId,
      phoneCount,
      templateCount,
      blockers: setup.blockers,
      ...assets,
    };
  } catch (err) {
    await logOnboardingEvent(session.id, input.clientId, 3, 'embedded_signup', 'FAILED', { error: err instanceof Error ? err.message : 'Failed', mode });
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

export async function importConfiguredProviderWaba(clientId: string, actorId?: string) {
  const cfg = getMetaProviderConfig();
  if (!cfg.systemUserAccessToken || !cfg.wabaId || !cfg.phoneNumberId) {
    throw Object.assign(new Error('No existing WhatsApp Business API is configured on this server.'), { status: 409 });
  }
  return importMetaWorkspace({
    clientId,
    accessToken: cfg.systemUserAccessToken,
    wabaId: cfg.wabaId,
    phoneNumberId: cfg.phoneNumberId,
    businessId: cfg.businessId || undefined,
    actorId,
    mode: 'existing',
    source: 'sdk',
  });
}

export async function completeEmbeddedSignup(input: {
  clientId: string;
  code?: string;
  accessToken?: string;
  wabaId?: string;
  phoneNumberId?: string;
  businessId?: string;
  actorId?: string;
  mode?: 'new' | 'existing';
  source?: 'sdk' | 'redirect';
}) {
  return importMetaWorkspace(input);
}

export async function refreshPortalFromMeta(clientId: string, actorId?: string) {
  const token = await readClientCredential(clientId, 'user_access_token');
  if (!token?.value) {
    throw Object.assign(new Error('Connect Facebook first so Techantum can load this account from Meta.'), { status: 409 });
  }
  const supabase = createAdminClient();
  const { data: wabas } = await supabase.from('wa_business_accounts').select('waba_id').eq('client_id', clientId);
  if (!wabas?.length) {
    return importMetaWorkspace({ clientId, accessToken: token.value, actorId, mode: 'existing' });
  }
  await syncClientFromMeta(clientId, actorId);
  const assets = await getPortalWhatsAppAssets(clientId);
  const { data: client } = await supabase.from('wa_clients').select('meta_business_id').eq('id', clientId).maybeSingle();
  const setup = computeOnboardingSetup({
    hasToken: true,
    businessId: client?.meta_business_id,
    wabas: assets.wabas,
    phones: assets.phones,
    templateCount: assets.templateCount,
  });
  await supabase.from('wa_clients').update({
    meta_connection_status: setup.connectionStatus,
    onboarding_status: setup.ready ? 'COMPLETED' : 'CLIENT_CREATED',
    status: setup.ready ? 'ACTIVE' : 'ONBOARDING',
    last_synced_at: new Date().toISOString(),
  }).eq('id', clientId);
  return { ok: true, ...setup, ...assets };
}

export async function addPortalPhoneNumber(clientId: string, input: { cc: string; phoneNumber: string; verifiedName?: string; actorId?: string }) {
  const token = await readClientCredential(clientId, 'user_access_token');
  if (!token?.value) throw Object.assign(new Error('Connect Facebook first.'), { status: 409 });
  const supabase = createAdminClient();
  const { data: waba } = await supabase.from('wa_business_accounts').select('id,waba_id').eq('client_id', clientId).order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (!waba?.waba_id) throw Object.assign(new Error('Create the WhatsApp Business Account with Meta before adding a number.'), { status: 409 });
  const service = new MetaWhatsAppService({ clientId, accessToken: token.value, requireUserToken: true });
  const created = await service.addPhoneNumber(waba.waba_id, input.cc.replace(/\D/g, ''), input.phoneNumber.replace(/\D/g, ''), input.verifiedName);
  if (!created.ok) throw new Error(created.error?.userMessage || 'Meta could not add that phone number.');
  const phoneId = String((created.data as { id?: string } | null)?.id || '');
  let phone: Record<string, unknown> = { id: phoneId, display_phone_number: `+${input.cc.replace(/\D/g, '')}${input.phoneNumber.replace(/\D/g, '')}`, verified_name: input.verifiedName };
  if (phoneId) {
    const remote = await service.getPhoneNumber(phoneId);
    phone = { ...(remote.data || {}), ...phone, id: phoneId };
    await upsertPhoneFromMeta(clientId, waba.id, waba.waba_id, phone);
  }
  await writeAuditLog({ clientId, actorUserId: input.actorId, action: 'phone.added', resourceType: 'wa_phone', resourceId: phoneId || waba.waba_id });
  const assets = await refreshPortalFromMeta(clientId, input.actorId);
  const verification = String(phone.code_verification_status || '').toUpperCase();
  const metaStatus = String(phone.status || '').toUpperCase();
  const alreadyVerified = verification === 'VERIFIED' || metaStatus === 'CONNECTED';
  return {
    ...assets,
    phoneNumberId: phoneId,
    phone,
    alreadyVerified,
    needsVerification: Boolean(phoneId) && !alreadyVerified,
  };
}

export async function requestPortalPhoneCode(clientId: string, input: { phoneNumberId: string; method?: 'SMS' | 'VOICE' }) {
  const token = await readClientCredential(clientId, 'user_access_token');
  if (!token?.value) throw Object.assign(new Error('Connect Facebook first.'), { status: 409 });
  if (!input.phoneNumberId) throw Object.assign(new Error('Meta did not return a phone number ID for this number.'), { status: 400 });
  const service = new MetaWhatsAppService({ clientId, accessToken: token.value, requireUserToken: true });
  const current = await service.getPhoneNumber(input.phoneNumberId);
  const verification = String((current.data as { code_verification_status?: string } | null)?.code_verification_status || '').toUpperCase();
  const metaStatus = String((current.data as { status?: string } | null)?.status || '').toUpperCase();
  if (verification === 'VERIFIED' || metaStatus === 'CONNECTED') {
    return { ok: true, alreadyVerified: true, phone: current.data };
  }
  const result = await service.requestVerificationCode(input.phoneNumberId, input.method || 'SMS', 'en_US');
  if (!result.ok) throw new Error(result.error?.userMessage || result.error?.message || 'Meta could not send the verification code.');
  return { ok: true, alreadyVerified: false, phone: current.data };
}

export async function verifyPortalPhoneCode(clientId: string, input: { phoneNumberId: string; code: string; actorId?: string }) {
  const token = await readClientCredential(clientId, 'user_access_token');
  if (!token?.value) throw Object.assign(new Error('Connect Facebook first.'), { status: 409 });
  const service = new MetaWhatsAppService({ clientId, accessToken: token.value, requireUserToken: true });
  const result = await service.verifyCode(input.phoneNumberId, input.code);
  if (!result.ok) throw new Error(result.error?.userMessage || 'Meta could not verify that code.');
  await refreshPortalFromMeta(clientId, input.actorId);
  return { ok: true };
}

export async function registerPortalPhone(clientId: string, input: { phoneNumberId: string; pin: string; actorId?: string }) {
  const token = await readClientCredential(clientId, 'user_access_token');
  if (!token?.value) throw Object.assign(new Error('Connect Facebook first.'), { status: 409 });
  const service = new MetaWhatsAppService({ clientId, accessToken: token.value, requireUserToken: true });
  const result = await service.registerPhoneNumber(input.phoneNumberId, input.pin);
  if (!result.ok) throw new Error(result.error?.userMessage || 'Meta could not register that number.');
  await refreshPortalFromMeta(clientId, input.actorId);
  return { ok: true };
}
