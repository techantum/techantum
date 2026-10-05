import { randomUUID } from 'node:crypto';
import type { NormalizedMetaError } from './types';

const RETRYABLE_CODES = new Set(['4', '17', '32', '613', '80007', '130429', '131048', '131056']);

export function normalizeMetaError(operation: string, payload: unknown, httpStatus = 0): NormalizedMetaError {
  const body = (payload || {}) as {
    error?: {
      message?: string;
      type?: string;
      code?: number | string;
      error_subcode?: number | string;
      error_user_title?: string;
      error_user_msg?: string;
      fbtrace_id?: string;
    };
  };
  const err = body.error || {};
  const metaCode = String(err.code || httpStatus || '');
  const title = err.error_user_title || err.type || 'Meta request failed';
  const message = err.message || 'The Meta Graph API returned an error.';
  const rawUser = err.error_user_msg || message;
  const userMessage = recommendedAction(operation, metaCode, rawUser);
  return {
    provider: 'META',
    operation,
    metaCode,
    metaSubcode: String(err.error_subcode || ''),
    title,
    message,
    userMessage,
    retryable: httpStatus === 429 || RETRYABLE_CODES.has(metaCode),
    correlationId: err.fbtrace_id || randomUUID(),
  };
}

export function recommendedAction(operation: string, metaCode: string, message: string) {
  if (operation.includes('requestVerificationCode') || operation.includes('request_code')) {
    if (metaCode === '136024' || /1 hour|temporarily unavailable/i.test(message)) {
      return 'Meta locked verification for this number for about 1 hour. That happens when the number already has WhatsApp, or a code was requested too many times. Wait, or add the number with Meta instead of sending another SMS.';
    }
    if (/already verified|already registered|connected/i.test(message)) {
      return 'This number is already verified on Meta. You do not need another SMS code.';
    }
    return message;
  }
  if (operation.includes('register')) {
    return 'Phone number registration failed. Verify the number and PIN, then retry. Do not store the PIN.';
  }
  if (operation.includes('template')) {
    return 'Template request failed. Review naming, variables, samples and category, then retry.';
  }
  if (operation.includes('subscribe')) {
    return 'Webhook subscription failed. Confirm the app has whatsapp_business_management access on this WABA.';
  }
  if (metaCode === '190' || /token/i.test(message)) {
    return 'Authentication failed. Reconnect the client through Embedded Signup.';
  }
  return message;
}

export function formatUserFacingError(error: NormalizedMetaError) {
  return [
    error.title,
    '',
    'Meta response:',
    error.message,
    '',
    'Recommended action:',
    error.userMessage,
  ].join('\n');
}

export function sanitizeForLog(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === 'string') return maskSecrets(value);
  if (Array.isArray(value)) return value.map(sanitizeForLog);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (/token|secret|password|authorization|pin|credential/i.test(key)) {
        out[key] = '***';
      } else {
        out[key] = sanitizeForLog(nested);
      }
    }
    return out;
  }
  return value;
}

export function maskSecrets(value: string) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer ***')
    .replace(/access_token=[^&\s]+/gi, 'access_token=***')
    .replace(/client_secret=[^&\s]+/gi, 'client_secret=***')
    .replace(/appsecret_proof=[^&\s]+/gi, 'appsecret_proof=***')
    .replace(/\b\d{4,8}\b/g, (m) => (m.length <= 6 ? '***' : m));
}
