import { createHmac, randomUUID } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMetaProviderConfig } from '../config';
import { normalizeMetaError, sanitizeForLog } from '../errors';
import type { NormalizedMetaError } from '../types';

export type MetaRequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE';
  path: string;
  query?: Record<string, string | number | undefined>;
  body?: Record<string, unknown> | URLSearchParams;
  accessToken?: string;
  clientId?: string | null;
  operation: string;
  retry?: number;
};

export type MetaResult<T> = {
  ok: boolean;
  data: T | null;
  error: NormalizedMetaError | null;
  httpStatus: number;
  correlationId: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function appSecretProof(token: string, appSecret: string) {
  return createHmac('sha256', appSecret).update(token).digest('hex');
}

function endpointPattern(path: string) {
  return path.replace(/\/\d{6,}/g, '/{id}').replace(/\/[A-Za-z0-9_-]{10,}/g, '/{id}');
}

export async function metaRequest<T = Record<string, unknown>>(options: MetaRequestOptions): Promise<MetaResult<T>> {
  const cfg = getMetaProviderConfig();
  if (!cfg.graphVersion) {
    return {
      ok: false,
      data: null,
      httpStatus: 500,
      correlationId: randomUUID(),
      error: {
        provider: 'META',
        operation: options.operation,
        metaCode: '',
        metaSubcode: '',
        title: 'Graph API version missing',
        message: 'META_GRAPH_API_VERSION is not configured.',
        userMessage: 'Set META_GRAPH_API_VERSION in the server environment.',
        retryable: false,
        correlationId: randomUUID(),
      },
    };
  }

  const token = options.accessToken || cfg.systemUserAccessToken;
  const maxAttempts = Math.min(Math.max(options.retry ?? 3, 1), 5);
  let lastError: NormalizedMetaError | null = null;
  let lastStatus = 0;
  const correlationId = randomUUID();
  const started = Date.now();

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const url = new URL(`${cfg.graphBase}${options.path.startsWith('/') ? options.path : `/${options.path}`}`);
    Object.entries(options.query || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    });
    if (token) url.searchParams.set('access_token', token);
    if (token && cfg.appSecret) url.searchParams.set('appsecret_proof', appSecretProof(token, cfg.appSecret));

    const isForm = options.body instanceof URLSearchParams;
    const res = await fetch(url.toString(), {
      method: options.method || 'GET',
      headers: isForm ? { 'Content-Type': 'application/x-www-form-urlencoded' } : { 'Content-Type': 'application/json' },
      body: options.body ? (isForm ? options.body.toString() : JSON.stringify(options.body)) : undefined,
    });

    lastStatus = res.status;
    const payload = (await res.json().catch(() => ({}))) as T & { error?: unknown; paging?: { next?: string } };
    if (res.ok) {
      await writeApiLog({
        clientId: options.clientId,
        operation: options.operation,
        endpoint: endpointPattern(options.path),
        method: options.method || 'GET',
        httpStatus: res.status,
        durationMs: Date.now() - started,
        correlationId,
        status: 'SUCCESS',
        retryCount: attempt - 1,
        request: sanitizeForLog(options.body || options.query || {}),
        response: sanitizeForLog(payload),
      });
      return { ok: true, data: payload, error: null, httpStatus: res.status, correlationId };
    }

    lastError = normalizeMetaError(options.operation, payload, res.status);
    const retryAfter = Number(res.headers.get('retry-after') || 0);
    if (!lastError.retryable || attempt === maxAttempts) {
      await writeApiLog({
        clientId: options.clientId,
        operation: options.operation,
        endpoint: endpointPattern(options.path),
        method: options.method || 'GET',
        httpStatus: res.status,
        metaErrorCode: lastError.metaCode,
        durationMs: Date.now() - started,
        correlationId,
        status: lastError.retryable ? 'RETRYING' : 'FAILURE',
        retryCount: attempt - 1,
        request: sanitizeForLog(options.body || options.query || {}),
        response: sanitizeForLog(payload),
      });
      break;
    }
    await sleep(retryAfter > 0 ? retryAfter * 1000 : Math.min(8000, 400 * 2 ** (attempt - 1)));
  }

  return { ok: false, data: null, error: lastError, httpStatus: lastStatus, correlationId };
}

export async function metaPaginate<T>(options: MetaRequestOptions, limit = 500): Promise<MetaResult<T[]>> {
  const rows: T[] = [];
  let after: string | undefined;
  do {
    const page = await metaRequest<{ data?: T[]; paging?: { cursors?: { after?: string }; next?: string } }>({
      ...options,
      query: { ...options.query, limit: 100, after },
    });
    if (!page.ok) return { ...page, data: rows };
    rows.push(...(page.data?.data || []));
    after = page.data?.paging?.cursors?.after;
    if (!page.data?.paging?.next) break;
  } while (after && rows.length < limit);
  return { ok: true, data: rows, error: null, httpStatus: 200, correlationId: randomUUID() };
}

async function writeApiLog(row: {
  clientId?: string | null;
  operation: string;
  endpoint: string;
  method: string;
  httpStatus: number;
  metaErrorCode?: string;
  durationMs: number;
  correlationId: string;
  status: string;
  retryCount: number;
  request: unknown;
  response: unknown;
}) {
  try {
    const supabase = createAdminClient();
    await supabase.from('wa_api_logs').insert({
      client_id: row.clientId || null,
      operation: row.operation,
      endpoint: row.endpoint,
      method: row.method,
      http_status: row.httpStatus,
      meta_error_code: row.metaErrorCode || null,
      duration_ms: row.durationMs,
      correlation_id: row.correlationId,
      status: row.status,
      retry_count: row.retryCount,
      sanitized_request: row.request,
      sanitized_response: row.response,
    });
  } catch (err) {
    console.error('[wa-provider] failed to persist API log', err);
  }
}
