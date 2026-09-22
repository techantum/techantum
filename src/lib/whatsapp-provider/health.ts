import type { HealthFactor, PlatformHealth } from './types';

export function scorePlatformHealth(input: {
  metaConnected: boolean;
  tokenValid?: boolean;
  phoneQuality?: string | null;
  wabaStatus?: string | null;
  webhookHealthy?: boolean;
  failureRate?: number;
  templateRejectionRate?: number;
  lastSyncAgeHours?: number | null;
}): { health: PlatformHealth; reasons: string[]; factors: HealthFactor[] } {
  const factors: HealthFactor[] = [
    {
      key: 'connection',
      label: 'Meta connection',
      ok: input.metaConnected && input.tokenValid !== false,
      weight: 3,
      detail: input.metaConnected ? 'Connected' : 'Disconnected',
    },
    {
      key: 'quality',
      label: 'Phone quality',
      ok: !['RED', 'FLAGGED'].includes((input.phoneQuality || '').toUpperCase()),
      weight: 2,
      detail: input.phoneQuality || 'UNKNOWN',
    },
    {
      key: 'waba',
      label: 'WABA state',
      ok: !/banned|disabled|restricted/i.test(input.wabaStatus || ''),
      weight: 2,
      detail: input.wabaStatus || 'Unknown',
    },
    {
      key: 'webhook',
      label: 'Webhook health',
      ok: input.webhookHealthy !== false,
      weight: 2,
      detail: input.webhookHealthy === false ? 'Delivery failures detected' : 'Healthy',
    },
    {
      key: 'failures',
      label: 'Message failure rate',
      ok: (input.failureRate || 0) < 0.08,
      weight: 2,
      detail: `${Math.round((input.failureRate || 0) * 100)}%`,
    },
    {
      key: 'templates',
      label: 'Template rejection rate',
      ok: (input.templateRejectionRate || 0) < 0.3,
      weight: 1,
      detail: `${Math.round((input.templateRejectionRate || 0) * 100)}%`,
    },
    {
      key: 'sync',
      label: 'Sync freshness',
      ok: input.lastSyncAgeHours == null || input.lastSyncAgeHours < 24,
      weight: 1,
      detail: input.lastSyncAgeHours == null ? 'Never synced' : `${Math.round(input.lastSyncAgeHours)}h ago`,
    },
  ];

  if (!input.metaConnected) {
    return { health: 'DISCONNECTED', reasons: ['Meta connection is not established'], factors };
  }

  const failed = factors.filter((f) => !f.ok);
  const critical = failed.some((f) => ['connection', 'quality', 'waba'].includes(f.key) && f.weight >= 2 && /RED|banned|disabled/i.test(f.detail));
  if (critical || (input.phoneQuality || '').toUpperCase() === 'RED') {
    return { health: 'CRITICAL', reasons: failed.map((f) => `${f.label}: ${f.detail}`), factors };
  }
  if (failed.length) {
    return { health: 'ATTENTION', reasons: failed.map((f) => `${f.label}: ${f.detail}`), factors };
  }
  return { health: 'HEALTHY', reasons: ['All operational checks passed'], factors };
}
