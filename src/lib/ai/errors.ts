import type { AIProviderId } from './types';

export class AIProviderError extends Error {
  provider: AIProviderId;
  status: number;
  code: string;
  type: string;

  constructor(input: {
    provider: AIProviderId;
    message: string;
    status?: number;
    code?: string;
    type?: string;
  }) {
    super(input.message);
    this.name = 'AIProviderError';
    this.provider = input.provider;
    this.status = input.status ?? 0;
    this.code = (input.code || '').toLowerCase();
    this.type = (input.type || '').toLowerCase();
  }
}

const BILLING_CODES = new Set([
  'credit_balance_exhausted',
  'insufficient_quota',
  'billing_not_active',
  'account_deactivated',
  'billing_hard_limit_reached',
]);

const UNAVAILABLE_CODES = new Set([
  'econnreset',
  'etimedout',
  'enotfound',
  'und_err_connect_timeout',
  'und_err_headers_timeout',
  'overloaded_error',
  'unavailable',
  'internal',
  'timeouterror',
  'incomplete',
  'max_tokens',
  'empty_response',
]);

export function isFallbackEligible(error: unknown) {
  if (!(error instanceof AIProviderError)) {
    if (error instanceof Error && /timeout|aborted|network|fetch failed/i.test(error.message)) return true;
    return false;
  }

  if (BILLING_CODES.has(error.code) || BILLING_CODES.has(error.type)) return true;
  if (UNAVAILABLE_CODES.has(error.code) || UNAVAILABLE_CODES.has(error.type)) return true;
  if ([500, 502, 503, 504].includes(error.status)) return true;
  if (/timeout|aborted|network|fetch failed|high demand|try again later|overloaded|spikes in demand/i.test(error.message)) {
    return true;
  }

  if (error.status === 429 || error.code === 'rate_limit_exceeded' || error.code === 'resource_exhausted') {
    return /quota|credit|billing|balance|spend limit|usage limit|high demand|try again later|overloaded/i.test(
      error.message
    );
  }

  return /quota|credit_balance|insufficient_quota|billing/i.test(error.message);
}

export function describeError(error: unknown) {
  if (error instanceof AIProviderError) {
    return [error.code || error.type, error.message].filter(Boolean).join(': ') || 'Provider error';
  }
  if (error instanceof Error) return error.message;
  return 'Unknown provider error';
}
