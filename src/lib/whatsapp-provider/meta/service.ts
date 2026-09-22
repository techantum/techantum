import { facebookLoginRedirectUri } from '@/lib/auth/public-origin';
import { getMetaProviderConfig } from '../config';
import { storeClientCredential } from '../credentials';
import { metaPaginate, metaRequest } from './meta-client';

export class MetaWhatsAppService {
  constructor(
    private readonly ctx: {
      clientId?: string | null;
      accessToken?: string;
    } = {}
  ) {}

  private token(override?: string) {
    return override || this.ctx.accessToken || getMetaProviderConfig().systemUserAccessToken;
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

  async exchangeAuthorizationCode(code: string) {
    const cfg = getMetaProviderConfig();
    const body = new URLSearchParams({
      client_id: cfg.appId,
      client_secret: cfg.appSecret,
      redirect_uri: facebookLoginRedirectUri(),
      code,
    });
    return metaRequest<{ access_token?: string; expires_in?: number }>({
      operation: 'exchangeAuthorizationCode',
      path: '/oauth/access_token',
      method: 'POST',
      body,
      clientId: this.ctx.clientId,
    });
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

  async discoverSignupAssets(hints: { businessId?: string; wabaId?: string; phoneNumberId?: string }) {
    let businessId = hints.businessId || '';
    let wabaId = hints.wabaId || '';
    let phoneNumberId = hints.phoneNumberId || '';

    if (!businessId) {
      const businesses = await metaRequest<{ data?: { id?: string }[] }>(
        this.base('discoverBusinesses', '/me/businesses', { query: { fields: 'id,name' } })
      );
      businessId = businesses.data?.data?.[0]?.id || '';
    }

    if (!wabaId && businessId) {
      const owned = await this.getBusinessAccounts(businessId);
      const ownedRows = ((owned.data as { data?: { id?: string }[] } | null)?.data || []) as { id?: string }[];
      wabaId = ownedRows[0]?.id || '';
      if (!wabaId) {
        const shared = await this.getClientWabas(businessId);
        const sharedRows = ((shared.data as { data?: { id?: string }[] } | null)?.data || []) as { id?: string }[];
        wabaId = sharedRows[0]?.id || '';
      }
    }

    if (wabaId && !phoneNumberId) {
      const phones = await this.getPhoneNumbers(wabaId);
      phoneNumberId = String((phones.data?.[0] as { id?: string } | undefined)?.id || '');
    }

    return { businessId, wabaId, phoneNumberId };
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
    return metaPaginate(
      this.base('getPhoneNumbers', `/${wabaId}/phone_numbers`, {
        query: { fields: 'id,display_phone_number,verified_name,quality_rating,code_verification_status,is_official_business_account,status,throughput,platform_type,messaging_limit_tier' },
      })
    );
  }

  async getPhoneNumber(phoneNumberId: string) {
    return metaRequest(
      this.base('getPhoneNumber', `/${phoneNumberId}`, {
        query: { fields: 'id,display_phone_number,verified_name,quality_rating,code_verification_status,status,throughput,messaging_limit_tier,webhook_configuration' },
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
