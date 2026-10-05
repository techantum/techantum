export type PhoneDisplayTone = 'emerald' | 'amber' | 'rose' | 'slate';

export type PhoneDisplayState = {
  key: 'CONNECTED' | 'IN_REVIEW' | 'EXPIRED' | 'DISCONNECTED' | 'RESTRICTED' | 'UNKNOWN';
  label: string;
  tone: PhoneDisplayTone;
  metaStatus: string;
  verification: string;
};

type PhoneLike = {
  status?: string | null;
  registration_status?: string | null;
  quality_rating?: string | null;
  messaging_status?: string | null;
  raw_json?: Record<string, unknown> | null;
};

function upper(value: unknown) {
  return String(value || '').toUpperCase();
}

function metaPayload(phone: PhoneLike) {
  const raw = phone.raw_json && typeof phone.raw_json === 'object' ? phone.raw_json : {};
  return {
    status: upper(raw.status || phone.status),
    verification: upper(raw.code_verification_status || phone.registration_status),
    quality: upper(raw.quality_rating || phone.quality_rating),
    nameStatus: upper(raw.name_status),
  };
}

export function resolveMetaPhoneState(phone: PhoneLike): PhoneDisplayState {
  const { status, verification, quality } = metaPayload(phone);
  const connected = status === 'CONNECTED' || status === 'ACTIVE' || /GREEN|YELLOW|RED/.test(quality);

  if (/BANNED|RESTRICTED|FLAGGED|RATE_LIMITED/.test(status)) {
    return { key: 'RESTRICTED', label: titleCase(status), tone: 'rose', metaStatus: status, verification };
  }
  if (/DISCONNECTED|DELETED|MIGRATED/.test(status)) {
    return { key: 'DISCONNECTED', label: titleCase(status), tone: 'rose', metaStatus: status, verification };
  }
  if (connected) {
    return { key: 'CONNECTED', label: 'Connected', tone: 'emerald', metaStatus: status || 'CONNECTED', verification };
  }
  if (status === 'PENDING' || status === 'UNVERIFIED' || verification === 'NOT_VERIFIED') {
    return { key: 'IN_REVIEW', label: 'In Review', tone: 'amber', metaStatus: status, verification };
  }
  if (verification === 'EXPIRED') {
    return { key: 'IN_REVIEW', label: 'Verification expired', tone: 'amber', metaStatus: status, verification };
  }
  if (verification === 'VERIFIED') {
    return { key: 'CONNECTED', label: 'Connected', tone: 'emerald', metaStatus: status || 'CONNECTED', verification };
  }
  return { key: 'UNKNOWN', label: titleCase(status || verification) || 'Unknown', tone: 'slate', metaStatus: status, verification };
}

export function persistMetaPhoneFields(phone: Record<string, unknown>) {
  const state = resolveMetaPhoneState({
    status: String(phone.status || ''),
    registration_status: String(phone.code_verification_status || ''),
    quality_rating: String(phone.quality_rating || ''),
    raw_json: phone,
  });
  return {
    status: state.key === 'CONNECTED' ? 'ACTIVE' : state.key === 'RESTRICTED' || state.key === 'DISCONNECTED' ? 'INACTIVE' : 'ACTIVE',
    registration_status: state.key,
    quality_rating: String(phone.quality_rating || 'UNKNOWN').toUpperCase(),
    messaging_status: typeof phone.messaging_limit_tier === 'string' ? phone.messaging_limit_tier : null,
    display: state,
  };
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}
