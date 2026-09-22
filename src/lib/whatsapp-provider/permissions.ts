import type { ClientPortalRole } from './types';

export const WA_PERMISSIONS = {
  'whatsapp.client.create': 'Create WhatsApp clients',
  'whatsapp.client.update': 'Update WhatsApp clients',
  'whatsapp.client.disable': 'Disable or archive clients',
  'whatsapp.client.view': 'View clients',
  'whatsapp.onboarding.manage': 'Run Embedded Signup and onboarding',
  'whatsapp.template.create': 'Create templates',
  'whatsapp.template.update': 'Edit templates',
  'whatsapp.template.internal_approve': 'Internally approve templates',
  'whatsapp.template.submit_meta': 'Submit templates to Meta',
  'whatsapp.template.delete': 'Delete templates',
  'whatsapp.phone.register': 'Register phone numbers',
  'whatsapp.message.send': 'Send messages and tests',
  'whatsapp.webhook.reprocess': 'Reprocess webhooks',
  'whatsapp.webhook.view': 'View webhook events',
  'whatsapp.billing.view': 'View billing',
  'whatsapp.billing.update': 'Update billing',
  'whatsapp.credit.attach': 'Attach Meta credit line',
  'whatsapp.inbox.reply': 'Reply in inbox',
  'whatsapp.campaign.launch': 'Launch campaigns',
  'whatsapp.settings.update': 'Update Meta integration settings',
  'whatsapp.audit.view': 'View audit logs',
  'whatsapp.export': 'Export reports',
} as const;

export type WaPermission = keyof typeof WA_PERMISSIONS;

const ALL = Object.keys(WA_PERMISSIONS) as WaPermission[];

const PROVIDER_GRANTS: Record<string, WaPermission[]> = {
  SUPER_ADMIN: ALL,
  PROVIDER_ADMIN: ALL.filter((p) => p !== 'whatsapp.credit.attach'),
  SUPPORT_ADMIN: [
    'whatsapp.client.view',
    'whatsapp.webhook.view',
    'whatsapp.webhook.reprocess',
    'whatsapp.inbox.reply',
    'whatsapp.audit.view',
  ],
  TEMPLATE_REVIEWER: [
    'whatsapp.client.view',
    'whatsapp.template.create',
    'whatsapp.template.update',
    'whatsapp.template.internal_approve',
  ],
  DEVELOPER: [
    'whatsapp.client.view',
    'whatsapp.webhook.view',
    'whatsapp.webhook.reprocess',
    'whatsapp.settings.update',
    'whatsapp.audit.view',
  ],
  FINANCE: ['whatsapp.client.view', 'whatsapp.billing.view', 'whatsapp.billing.update', 'whatsapp.export'],
};

const CLIENT_GRANTS: Record<ClientPortalRole, WaPermission[]> = {
  CLIENT_ADMIN: [
    'whatsapp.client.view',
    'whatsapp.onboarding.manage',
    'whatsapp.template.create',
    'whatsapp.template.update',
    'whatsapp.template.submit_meta',
    'whatsapp.message.send',
    'whatsapp.inbox.reply',
    'whatsapp.campaign.launch',
    'whatsapp.billing.view',
    'whatsapp.export',
  ],
  CLIENT_MARKETING: [
    'whatsapp.client.view',
    'whatsapp.template.create',
    'whatsapp.template.update',
    'whatsapp.campaign.launch',
    'whatsapp.export',
  ],
  CLIENT_SUPPORT: ['whatsapp.client.view', 'whatsapp.inbox.reply'],
  CLIENT_VIEWER: ['whatsapp.client.view'],
};

export function providerHasPermission(role: string | null | undefined, permission: WaPermission) {
  if (!role) return false;
  return (PROVIDER_GRANTS[role] || []).includes(permission);
}

export function clientHasPermission(role: ClientPortalRole | null | undefined, permission: WaPermission) {
  if (!role) return false;
  return (CLIENT_GRANTS[role] || []).includes(permission);
}

export function assertTenant(resourceClientId: string | null | undefined, actorClientId: string | null | undefined) {
  if (!actorClientId) return;
  if (!resourceClientId || resourceClientId !== actorClientId) {
    const error = new Error('Tenant isolation violation');
    error.name = 'TenantIsolationError';
    throw error;
  }
}
