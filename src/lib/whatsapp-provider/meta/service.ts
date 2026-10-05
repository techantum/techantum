import { facebookLoginRedirectUri } from '@/lib/auth/public-origin';
import { getMetaProviderConfig } from '../config';
import { storeClientCredential } from '../credentials';
import { metaPaginate, metaRequest } from './meta-client';

export class MetaWhatsAppService {
  constructor(
    private readonly ctx: {
      clientId?: string | null;
      accessToken?: string;
      requireUserToken?: boolean;
    } = {}
  ) {}

  private token(override?: string) {
    if (override) return override;
    if (this.ctx.accessToken) return this.ctx.accessToken;
    if (this.ctx.requireUserToken) return '';
    return getMetaProviderConfig().systemUserAccessToken;
  }

  private base(operation: string, path: string, extra: Record<string, unknown> = {}) {
    return {
      operation,
      path,
      clientId: this.ctx.clientId,
      accessToken: this.token(),
      ...extra,
    };
  }

  async exchangeAuthorizationCode(code: string, options?: { redirectUri?: string | null }) {
    const cfg = getMetaProviderConfig();
    const tryExchange = async (redirectUri?: string | null) => {
      const body = new URLSearchParams({
        client_id: cfg.appId,
        client_secret: cfg.appSecret,
        code,
      });
      if (redirectUri) body.set('redirect_uri', redirectUri);
      return metaRequest<{ access_token?: string; expires_in?: number }>({
        operation: 'exchangeAuthorizationCode',
        path: '/oauth/access_token',
        method: 'POST',
        body,
        clientId: this.ctx.clientId,
      });
    };

    const preferred = options?.redirectUri === null ? null : options?.redirectUri || facebookLoginRedirectUri();
    const first = await tryExchange(preferred);
    if (first.ok && first.data?.access_token) return first;
    const fallback = preferred ? await tryExchange(null) : await tryExchange(facebookLoginRedirectUri());
    return fallback.ok ? fallback : first;
  }

  async persistClientToken(clientId: string, accessToken: string, expiresIn?: number) {
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
    await storeClientCredential(clientId, 'user_access_token', accessToken, expiresAt);
  }

  async connectBusiness(businessId: string) {
    return this.getBusinessAccounts(businessId);
  }

  async getBusinessAccounts(businessId?: string) {
    const id = businessId || getMetaProviderConfig().businessId;
    return metaRequest(this.base('getBusinessAccounts', `/${id}/owned_whatsapp_business_accounts`, { query: { fields: 'id,name,currency,timezone,account_review_status' } }));
  }

  async getClientWabas(businessId?: string) {
    const id = businessId || getMetaProviderConfig().businessId;
    if (!id) return { ok: false, data: null, error: null, httpStatus: 400, correlationId: '' };
    return metaRequest(
      this.base('getClientWabas', `/${id}/client_whatsapp_business_accounts`, {
        query: { fields: 'id,name,currency,timezone,account_review_status' },
      })
    );
  }

  async getBusiness(businessId: string) {
    return metaRequest(
      this.base('getBusiness', `/${businessId}`, {
        query: { fields: 'id,name,verification_status,created_time,profile_picture_uri,vertical' },
      })
    );
  }

  async listBusinesses() {
    return metaRequest<{
      data?: Array<{
        id?: string;
        name?: string;
        verification_status?: string;
        owned_whatsapp_business_accounts?: { data?: Array<Record<string, unknown>> };
        client_whatsapp_business_accounts?: { data?: Array<Record<string, unknown>> };
      }>;
    }>(
      this.base('listBusinesses', '/me/businesses', {
        query: {
          fields:
            'id,name,verification_status,created_time,owned_whatsapp_business_accounts{id,name,currency,timezone,account_review_status,phone_numbers{id,display_phone_number,verified_name,quality_rating,code_verification_status,status,messaging_limit_tier,name_status}},client_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number,verified_name,quality_rating,code_verification_status,status,messaging_limit_tier}}',
        },
      })
    );
  }

  async listAssignedWabas() {
    return metaRequest<{ data?: Array<Record<string, unknown>> }>(
      this.base('listAssignedWabas', '/me/assigned_whatsapp_business_accounts', {
        query: { fields: 'id,name,currency,timezone,account_review_status' },
      })
    );
  }

  async listWabasForBusiness(businessId: string) {
    const [owned, shared] = await Promise.all([this.getBusinessAccounts(businessId), this.getClientWabas(businessId)]);
    const ownedRows = ((owned.data as { data?: Array<Record<string, unknown>> } | null)?.data || []) as Array<Record<string, unknown>>;
    const sharedRows = ((shared.data as { data?: Array<Record<string, unknown>> } | null)?.data || []) as Array<Record<string, unknown>>;
    const seen = new Set<string>();
    return [...ownedRows, ...sharedRows].filter((row) => {
      const id = String(row.id || '');
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  async discoverSignupAssets(hints: { businessId?: string; wabaId?: string; phoneNumberId?: string }) {
    let businessId = hints.businessId || '';
    let wabaId = hints.wabaId || '';
    let phoneNumberId = hints.phoneNumberId || '';
    const nestedPhones: Array<Record<string, unknown>> = [];
    const businesses = await this.listBusinesses();
    const businessRows = businesses.data?.data || [];
    if (!businessId) businessId = businessRows[0]?.id || '';

    const wabas: Array<Record<string, unknown> & { business_id?: string }> = [];
    const seen = new Set<string>();
    const addWaba = (row: Record<string, unknown>, ownerBusinessId?: string) => {
      const id = String(row.id || '');
      if (!id || seen.has(id)) return;
      seen.add(id);
      wabas.push({ ...row, business_id: ownerBusinessId || String(row.business_id || '') });
      const phones = ((row.phone_numbers as { data?: Array<Record<string, unknown>> } | undefined)?.data || []) as Array<Record<string, unknown>>;
      for (const phone of phones) nestedPhones.push({ ...phone, waba_id: id });
    };

    for (const business of businessRows) {
      const ownerId = String(business.id || '');
      for (const row of business.owned_whatsapp_business_accounts?.data || []) addWaba(row, ownerId);
      for (const row of business.client_whatsapp_business_accounts?.data || []) addWaba(row, ownerId);
    }

    const assigned = await this.listAssignedWabas();
    for (const row of assigned.data?.data || []) addWaba(row);

    const configured = getMetaProviderConfig();
    if (configured.businessId) {
      const rows = await this.listWabasForBusiness(configured.businessId);
      for (const row of rows) addWaba(row, configured.businessId);
    }
    if (configured.wabaId) {
      const direct = await this.getWaba(configured.wabaId);
      if (direct.ok && direct.data) addWaba({ ...(direct.data as Record<string, unknown>), id: configured.wabaId }, configured.businessId);
    }

    const businessIds = [...new Set([businessId, ...businessRows.map((row) => String(row.id || ''))].filter(Boolean))];
    for (const id of businessIds) {
      const rows = await this.listWabasForBusiness(id);
      for (const row of rows) addWaba(row, id);
    }

    if (wabaId && !businessId) {
      const match = wabas.find((row) => String(row.id) === wabaId);
      businessId = String(match?.business_id || '');
    }
    if (!wabaId) wabaId = String(wabas[0]?.id || '');
    if (wabaId && !businessId) businessId = String(wabas.find((row) => String(row.id) === wabaId)?.business_id || businessId);

    const phones = wabaId ? await this.getPhoneNumbers(wabaId) : { ok: true, data: [] as Array<Record<string, unknown>> };
    const phoneRows = [...((phones.data || []) as Array<Record<string, unknown>>), ...nestedPhones.filter((row) => !wabaId || String(row.waba_id) === wabaId)];
    const uniquePhones: Array<Record<string, unknown>> = [];
    const seenPhones = new Set<string>();
    for (const phone of phoneRows) {
      const id = String(phone.id || '');
      if (!id || seenPhones.has(id)) continue;
      seenPhones.add(id);
      uniquePhones.push(phone);
    }
    if (wabaId && !phoneNumberId) {
      phoneNumberId = String((uniquePhones[0] as { id?: string } | undefined)?.id || '');
    }

    return {
      businessId,
      wabaId,
      phoneNumberId,
      businesses: businessRows,
      wabas,
      phones: uniquePhones,
    };
  }

  async addPhoneNumber(wabaId: string, cc: string, phoneNumber: string, verifiedName?: string) {
    const name = String(verifiedName || '').trim();
    if (!name) throw Object.assign(new Error('A verified display name is required by Meta.'), { status: 400 });
    return metaRequest(
      this.base('addPhoneNumber', `/${wabaId}/phone_numbers`, {
        method: 'POST',
        body: { cc, phone_number: phoneNumber, verified_name: name, migrate_phone_number: false },
      })
    );
  }

  async requestVerificationCode(phoneNumberId: string, codeMethod: 'SMS' | 'VOICE' = 'SMS', language = 'en_US') {
    return metaRequest(
      this.base('requestVerificationCode', `/${phoneNumberId}/request_code`, {
        method: 'POST',
        body: { code_method: codeMethod, language },
      })
    );
  }

  async verifyCode(phoneNumberId: string, code: string) {
    return metaRequest(
      this.base('verifyCode', `/${phoneNumberId}/verify_code`, {
        method: 'POST',
        body: { code },
      })
    );
  }

  async getWaba(wabaId: string) {
    return metaRequest(
      this.base('getWaba', `/${wabaId}`, {
        query: { fields: 'id,name,currency,timezone,account_review_status,business_verification_status,on_behalf_of_business_info,ownership_type' },
      })
    );
  }

  async getAssignedUsers(wabaId: string) {
    return metaPaginate(this.base('getAssignedUsers', `/${wabaId}/assigned_users`, { query: { fields: 'id,name,tasks' } }));
  }

  async assignSystemUser(wabaId: string, userId: string, tasks = ['MANAGE']) {
    return metaRequest(
      this.base('assignSystemUser', `/${wabaId}/assigned_users`, {
        method: 'POST',
        query: { user: userId, tasks: tasks.join(',') },
      })
    );
  }

  async getPhoneNumbers(wabaId: string) {
    const listed = await metaPaginate<Record<string, unknown>>(
      this.base('getPhoneNumbers', `/${wabaId}/phone_numbers`, {
        query: { fields: 'id,display_phone_number,verified_name,quality_rating,code_verification_status,is_official_business_account,status,throughput,platform_type,messaging_limit_tier,name_status,new_name_status,account_mode,is_pin_enabled' },
      })
    );
    if (!listed.ok) return listed;
    const rows = await Promise.all(
      (listed.data || []).map(async (phone) => {
        if (phone.status && (phone.messaging_limit_tier || phone.quality_rating)) return phone;
        const id = String(phone.id || '');
        if (!id) return phone;
        const detail = await this.getPhoneNumber(id);
        return detail.ok && detail.data ? { ...phone, ...(detail.data as Record<string, unknown>) } : phone;
      }),
    );
    return { ...listed, data: rows };
  }

  async getPhoneNumber(phoneNumberId: string) {
    return metaRequest(
      this.base('getPhoneNumber', `/${phoneNumberId}`, {
        query: { fields: 'id,display_phone_number,verified_name,quality_rating,code_verification_status,status,throughput,messaging_limit_tier,name_status,new_name_status,account_mode,is_pin_enabled,webhook_configuration' },
      })
    );
  }

  async registerPhoneNumber(phoneNumberId: string, pin: string, dataLocalizationRegion?: string) {
    const body: Record<string, unknown> = { messaging_product: 'whatsapp', pin };
    if (dataLocalizationRegion) body.data_localization_region = dataLocalizationRegion;
    return metaRequest(this.base('registerPhoneNumber', `/${phoneNumberId}/register`, { method: 'POST', body }));
  }

  async getBusinessProfile(phoneNumberId: string) {
    return metaRequest(
      this.base('getBusinessProfile', `/${phoneNumberId}/whatsapp_business_profile`, {
        query: { fields: 'about,address,description,email,profile_picture_url,websites,vertical' },
      })
    );
  }

  async updateBusinessProfile(phoneNumberId: string, profile: Record<string, unknown>) {
    return metaRequest(
      this.base('updateBusinessProfile', `/${phoneNumberId}/whatsapp_business_profile`, {
        method: 'POST',
        body: { messaging_product: 'whatsapp', ...profile },
      })
    );
  }

  async subscribeWaba(wabaId: string) {
    return metaRequest(this.base('subscribeWaba', `/${wabaId}/subscribed_apps`, { method: 'POST' }));
  }

  async getWabaSubscriptions(wabaId: string) {
    return metaRequest(this.base('getWabaSubscriptions', `/${wabaId}/subscribed_apps`));
  }

  async unsubscribeWaba(wabaId: string) {
    return metaRequest(this.base('unsubscribeWaba', `/${wabaId}/subscribed_apps`, { method: 'DELETE' }));
  }

  async getTemplates(wabaId: string) {
    return metaPaginate(
      this.base('getTemplates', `/${wabaId}/message_templates`, {
        query: { fields: 'id,name,language,status,category,quality_score,rejected_reason,components,sub_category' },
      })
    );
  }

  async getTemplate(templateId: string) {
    return metaRequest(this.base('getTemplate', `/${templateId}`, { query: { fields: 'id,name,language,status,category,components,rejected_reason,quality_score' } }));
  }

  async createTemplate(wabaId: string, payload: Record<string, unknown>) {
    return metaRequest(this.base('createTemplate', `/${wabaId}/message_templates`, { method: 'POST', body: payload }));
  }

  async updateTemplate(templateId: string, payload: Record<string, unknown>) {
    return metaRequest(this.base('updateTemplate', `/${templateId}`, { method: 'POST', body: payload }));
  }

  async deleteTemplate(wabaId: string, name: string, hsmId?: string) {
    return metaRequest(
      this.base('deleteTemplate', `/${wabaId}/message_templates`, {
        method: 'DELETE',
        query: { name, hsm_id: hsmId },
      })
    );
  }

  async sendMessage(phoneNumberId: string, payload: Record<string, unknown>) {
    return metaRequest(
      this.base('sendMessage', `/${phoneNumberId}/messages`, {
        method: 'POST',
        body: { messaging_product: 'whatsapp', ...payload },
      })
    );
  }

  async sendTextMessage(phoneNumberId: string, to: string, body: string) {
    return this.sendMessage(phoneNumberId, { to, type: 'text', text: { body } });
  }

  async sendTemplateMessage(phoneNumberId: string, to: string, template: Record<string, unknown>) {
    return this.sendMessage(phoneNumberId, { to, type: 'template', template });
  }

  async sendMediaMessage(phoneNumberId: string, to: string, type: 'image' | 'document' | 'video', media: Record<string, unknown>) {
    return this.sendMessage(phoneNumberId, { to, type, [type]: media });
  }

  async getAnalytics(wabaId: string, start: number, end: number, granularity = 'DAY') {
    return metaRequest(
      this.base('getAnalytics', `/${wabaId}`, {
        query: { fields: `analytics.start(${start}).end(${end}).granularity(${granularity})` },
      })
    );
  }

  async getConversationAnalytics(wabaId: string, start: number, end: number) {
    return metaRequest(
      this.base('getConversationAnalytics', `/${wabaId}`, {
        query: {
          fields: `conversation_analytics.start(${start}).end(${end}).granularity(DAILY).dimensions(["CONVERSATION_CATEGORY","CONVERSATION_TYPE","COUNTRY","PHONE"])`,
        },
      })
    );
  }

  async getFlows(wabaId: string) {
    return metaPaginate(this.base('getFlows', `/${wabaId}/flows`));
  }

  async createFlow(wabaId: string, payload: Record<string, unknown>) {
    return metaRequest(this.base('createFlow', `/${wabaId}/flows`, { method: 'POST', body: payload }));
  }

  async updateFlow(flowId: string, payload: Record<string, unknown>) {
    return metaRequest(this.base('updateFlow', `/${flowId}`, { method: 'POST', body: payload }));
  }

  async publishFlow(flowId: string) {
    return metaRequest(this.base('publishFlow', `/${flowId}/publish`, { method: 'POST' }));
  }

  async getCreditSharingStatus(wabaId: string) {
    return metaRequest(this.base('getCreditSharingStatus', `/${wabaId}/extendedcredits`));
  }

  async attachCreditLine(wabaId: string) {
    const cfg = getMetaProviderConfig();
    if (!cfg.creditSharingEnabled) {
      throw new Error('FEATURE_META_CREDIT_SHARING is not enabled.');
    }
    if (!cfg.creditLineId) throw new Error('META_CREDIT_LINE_ID is not configured.');
    return metaRequest(
      this.base('attachCreditLine', `/${cfg.creditLineId}/whatsapp_credit_sharing_and_attach`, {
        method: 'POST',
        query: { waba_id: wabaId, waba_currency: 'USD' },
      })
    );
  }

  async debugToken(inputToken: string) {
    const cfg = getMetaProviderConfig();
    return metaRequest(
      this.base('healthCheck', '/debug_token', {
        query: { input_token: inputToken },
        accessToken: `${cfg.appId}|${cfg.appSecret}`,
      })
    );
  }

  async healthCheck(wabaId?: string) {
    const cfg = getMetaProviderConfig();
    const checks: Record<string, unknown> = {
      graphVersion: Boolean(cfg.graphVersion),
      appConfigured: Boolean(cfg.appId && cfg.appSecret),
      systemToken: Boolean(cfg.systemUserAccessToken),
      webhookToken: Boolean(cfg.webhookVerifyToken),
    };
    if (cfg.systemUserAccessToken) {
      const me = await metaRequest(this.base('healthCheck', '/me', { query: { fields: 'id,name' } }));
      checks.systemUser = me.ok;
      checks.systemUserError = me.error?.userMessage;
    }
    if (wabaId) {
      const waba = await this.getWaba(wabaId);
      checks.wabaRead = waba.ok;
      const subs = await this.getWabaSubscriptions(wabaId);
      checks.subscriptions = subs.ok;
    }
    return checks;
  }
}

export const metaWhatsApp = new MetaWhatsAppService();
