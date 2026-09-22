import { createHmac } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMetaAdsConfig } from './config';
import { adsEndpointPattern, stripSecrets } from './normalize';

const RETRYABLE_META_CODES = new Set(['4', '17', '32', '613', '80004', '80008']);

export type AdsRequestOptions = {
  method?: 'GET' | 'POST';
  path: string;
  query?: Record<string, string | number | undefined>;
  body?: Record<string, unknown>;
  operation: string;
  adAccountId?: string | null;
  syncRunId?: string | null;
};

export type AdsResult<T> = {
  ok: boolean;
  data: T | null;
  httpStatus: number;
  metaErrorCode: string;
  errorMessage: string;
  durationMs: number;
  endpoint: string;
};

export type GraphPaging<T> = {
  data?: T[];
  paging?: { cursors?: { after?: string; before?: string }; next?: string };
  error?: { message?: string; code?: number | string; error_subcode?: number | string };
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function appSecretProof(token: string, appSecret: string) {
  return createHmac('sha256', appSecret).update(token).digest('hex');
}

export async function adsRequest<T = Record<string, unknown>>(options: AdsRequestOptions): Promise<AdsResult<T>> {
  const cfg = getMetaAdsConfig();
  const endpoint = adsEndpointPattern(options.path);
  const method = options.method || 'GET';

  if (!cfg.graphVersion) {
    return failResult(endpoint, 500, '', 'META_GRAPH_API_VERSION is not configured.');
  }
  if (!cfg.accessToken) {
    return failResult(endpoint, 500, '', 'META_ADS_ACCESS_TOKEN is not configured.');
  }

  const maxAttempts = 2;
  let lastStatus = 0;
  let lastCode = '';
  let lastMessage = 'Marketing API request failed.';
  const started = Date.now();

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const url = new URL(`${cfg.graphBase}${options.path.startsWith('/') ? options.path : `/${options.path}`}`);
    Object.entries(options.query || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    });
    url.searchParams.set('access_token', cfg.accessToken);
    if (cfg.appSecret) url.searchParams.set('appsecret_proof', appSecretProof(cfg.accessToken, cfg.appSecret));

    const res = await fetch(url.toString(), {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    lastStatus = res.status;
    const payload = (await res.json().catch(() => ({}))) as T & GraphPaging<unknown>;
    const durationMs = Date.now() - started;
    const err = (payload as GraphPaging<unknown>).error;
    lastCode = String(err?.code || (res.ok ? '' : res.status));
    lastMessage = err?.message || (res.ok ? '' : `HTTP ${res.status}`);

    if (res.ok) {
      await writeAdsLog({
        syncRunId: options.syncRunId,
        adAccountId: options.adAccountId,
        operation: options.operation,
        endpoint,
        method,
        httpStatus: res.status,
        success: true,
        durationMs,
        sanitizedQuery: stripSecrets(options.query || {}),
      });
      return { ok: true, data: payload, httpStatus: res.status, metaErrorCode: '', errorMessage: '', durationMs, endpoint };
    }

    const retryable = res.status === 429 || RETRYABLE_META_CODES.has(lastCode);
    if (!retryable || attempt === maxAttempts) {
      await writeAdsLog({
        syncRunId: options.syncRunId,
        adAccountId: options.adAccountId,
        operation: options.operation,
        endpoint,
        method,
        httpStatus: res.status,
        metaErrorCode: lastCode,
        success: false,
        durationMs,
        errorMessage: lastMessage,
        sanitizedQuery: stripSecrets(options.query || {}),
      });
      break;
    }

    const retryAfter = Number(res.headers.get('retry-after') || 0);
    await sleep(retryAfter > 0 ? retryAfter * 1000 : 1500 * attempt);
  }

  return {
    ok: false,
    data: null,
    httpStatus: lastStatus,
    metaErrorCode: lastCode,
    errorMessage: lastMessage,
    durationMs: Date.now() - started,
    endpoint,
  };
}

export async function adsPaginate<T>(
  options: AdsRequestOptions,
  limits?: { maxItems?: number; maxPages?: number; pageSize?: number }
): Promise<AdsResult<T[]>> {
  const maxItems = limits?.maxItems ?? 250;
  const maxPages = limits?.maxPages ?? 5;
  const pageSize = limits?.pageSize ?? 50;
  const rows: T[] = [];
  let after: string | undefined;
  let last: AdsResult<GraphPaging<T>> | null = null;

  for (let page = 0; page < maxPages && rows.length < maxItems; page += 1) {
    last = await adsRequest<GraphPaging<T>>({
      ...options,
      query: { ...options.query, limit: pageSize, after },
    });
    if (!last.ok) {
      return { ...last, data: rows };
    }
    rows.push(...(last.data?.data || []));
    after = last.data?.paging?.cursors?.after;
    if (!last.data?.paging?.next || !after) break;
  }

  return {
    ok: true,
    data: rows,
    httpStatus: last?.httpStatus || 200,
    metaErrorCode: '',
    errorMessage: '',
    durationMs: last?.durationMs || 0,
    endpoint: last?.endpoint || adsEndpointPattern(options.path),
  };
}

function failResult(endpoint: string, httpStatus: number, metaErrorCode: string, errorMessage: string): AdsResult<never> {
  return {
    ok: false,
    data: null,
    httpStatus,
    metaErrorCode,
    errorMessage,
    durationMs: 0,
    endpoint,
  };
}

async function writeAdsLog(row: {
  syncRunId?: string | null;
  adAccountId?: string | null;
  operation: string;
  endpoint: string;
  method: string;
  httpStatus: number;
  metaErrorCode?: string;
  success: boolean;
  durationMs: number;
  errorMessage?: string;
  sanitizedQuery: unknown;
}) {
  try {
    const supabase = createAdminClient();
    await supabase.from('meta_ads_api_logs').insert({
      sync_run_id: row.syncRunId || null,
      ad_account_id: row.adAccountId || null,
      operation: row.operation,
      endpoint: row.endpoint,
      method: row.method,
      http_status: row.httpStatus,
      meta_error_code: row.metaErrorCode || null,
      success: row.success,
      duration_ms: row.durationMs,
      error_message: row.errorMessage || null,
      sanitized_query: row.sanitizedQuery,
    });
  } catch (err) {
    console.error('[meta-ads] failed to persist API log', err);
  }
}
