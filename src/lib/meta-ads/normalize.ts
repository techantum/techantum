export const ACCOUNT_STATUS_LABELS: Record<number, string> = {
  1: 'ACTIVE',
  2: 'DISABLED',
  3: 'UNSETTLED',
  7: 'PENDING_RISK_REVIEW',
  8: 'PENDING_SETTLEMENT',
  9: 'IN_GRACE_PERIOD',
  100: 'PENDING_CLOSURE',
  101: 'CLOSED',
  201: 'ANY_ACTIVE',
  202: 'ANY_CLOSED',
};

export function parseActId(value?: string | null): string {
  return String(value || '')
    .trim()
    .replace(/^act_/i, '');
}

export function actPath(id: string): string {
  return `/act_${parseActId(id)}`;
}

export function adsEndpointPattern(path: string): string {
  return path.replace(/\/act_\d+/gi, '/act_{id}').replace(/\/\d{6,}/g, '/{id}');
}

export function toFiniteNumber(value: unknown): number {
  if (value == null || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function accountStatusLabel(status?: number | null): string {
  if (status == null) return 'UNKNOWN';
  return ACCOUNT_STATUS_LABELS[status] || String(status);
}

export type InsightMetrics = {
  impressions: number;
  reach: number;
  clicks: number;
  uniqueClicks: number;
  spend: number;
  cpc: number;
  cpm: number;
  ctr: number;
  dateStart: string | null;
  dateStop: string | null;
};

export function mapInsightRow(row: Record<string, unknown> | null | undefined): InsightMetrics {
  const data = row || {};
  return {
    impressions: toFiniteNumber(data.impressions),
    reach: toFiniteNumber(data.reach),
    clicks: toFiniteNumber(data.clicks),
    uniqueClicks: toFiniteNumber(data.unique_clicks),
    spend: toFiniteNumber(data.spend),
    cpc: toFiniteNumber(data.cpc),
    cpm: toFiniteNumber(data.cpm),
    ctr: toFiniteNumber(data.ctr),
    dateStart: typeof data.date_start === 'string' ? data.date_start : null,
    dateStop: typeof data.date_stop === 'string' ? data.date_stop : null,
  };
}

export function rollingSuccessRate(rows: { success: boolean }[], windowSize = 500) {
  const slice = rows.slice(0, windowSize);
  const total = slice.length;
  const success = slice.filter((row) => row.success).length;
  const failed = total - success;
  const rate = total ? (success / total) * 100 : 0;
  return { total, success, failed, rate };
}

export function stripSecrets(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(stripSecrets);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (/token|secret|password|authorization|proof/i.test(key)) {
        out[key] = '***';
      } else {
        out[key] = stripSecrets(nested);
      }
    }
    return out;
  }
  return value;
}
