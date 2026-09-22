export type PlatformHealth = 'HEALTHY' | 'ATTENTION' | 'CRITICAL' | 'DISCONNECTED' | 'UNKNOWN';
export type ClientStatus = 'ACTIVE' | 'ONBOARDING' | 'ATTENTION' | 'SUSPENDED' | 'INACTIVE' | 'ARCHIVED';
export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFORMATION';
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'ASSIGNED' | 'RESOLVED';
export type MessageStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'RECEIVED';
export type WebhookProcessingStatus = 'RECEIVED' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'IGNORED' | 'DUPLICATE';
export type QualityRating = 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN' | 'NA';

export type InternalTemplateStatus =
  | 'DRAFT'
  | 'CLIENT_SUBMITTED'
  | 'INTERNAL_REVIEW'
  | 'INTERNAL_APPROVED'
  | 'CHANGES_REQUESTED'
  | 'SUBMITTED_TO_META'
  | 'META_PENDING'
  | 'META_APPROVED'
  | 'META_REJECTED'
  | 'META_FLAGGED'
  | 'META_DISABLED'
  | 'DELETED';

export type MetaTemplateStatus =
  | 'APPROVED'
  | 'PENDING'
  | 'REJECTED'
  | 'FLAGGED'
  | 'DISABLED'
  | 'DELETED'
  | 'REINSTATED'
  | 'IN_APPEAL'
  | 'PENDING_DELETION';

export type ProviderRole = 'SUPER_ADMIN' | 'PROVIDER_ADMIN' | 'SUPPORT_ADMIN' | 'TEMPLATE_REVIEWER' | 'DEVELOPER' | 'FINANCE';
export type ClientPortalRole = 'CLIENT_ADMIN' | 'CLIENT_MARKETING' | 'CLIENT_SUPPORT' | 'CLIENT_VIEWER';

export type NormalizedMetaError = {
  provider: 'META';
  operation: string;
  metaCode: string;
  metaSubcode: string;
  title: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  correlationId: string;
};

export type DateRangeKey =
  | 'today'
  | 'yesterday'
  | 'last_7'
  | 'last_30'
  | 'this_month'
  | 'previous_month'
  | 'custom';

export type TemplateComponent = {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION';
  text?: string;
  example?: { header_text?: string[]; body_text?: string[][]; header_handle?: string[] };
  buttons?: TemplateButton[];
};

export type TemplateButton = {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'OTP' | 'COPY_CODE';
  text: string;
  url?: string;
  phone_number?: string;
  otp_type?: string;
};

export type HealthFactor = {
  key: string;
  label: string;
  ok: boolean;
  weight: number;
  detail: string;
};
