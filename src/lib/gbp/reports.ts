import {
  getGbpDateRange,
  type AnalyticsCustomDates,
  type AnalyticsRange,
} from './config';
import { fetchGbpMultiDailyMetrics, type GbpDailyMetric, type FetchMultiDailyMetricsResponse } from './client';
import { getGbpCache, setGbpCache } from './cache';
import { getGbpOAuthStatus } from './oauth';

const CACHE_TTL_MS = 10 * 60 * 1000;

export interface GbpSummary {
  impressionsMaps: number;
  impressionsSearch: number;
  directionRequests: number;
  callClicks: number;
  websiteClicks: number;
  conversations: number;
  totalImpressions: number;
}

export interface GbpDailyPoint {
  date: string;
  impressionsMaps: number;
  impressionsSearch: number;
  directionRequests: number;
  callClicks: number;
  websiteClicks: number;
}

export interface GbpAnalyticsReport {
  configured: boolean;
  locationId: string;
  profileUrl?: string;
  fetchedAt: string;
  range: ReturnType<typeof getGbpDateRange>;
  summary: GbpSummary;
  daily: GbpDailyPoint[];
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function datedToIso(date?: { year?: number; month?: number; day?: number }): string | null {
  if (!date?.year || !date?.month || !date?.day) return null;
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`;
}

function num(value?: string | null): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function collectSeries(
  payload: FetchMultiDailyMetricsResponse
): Map<string, Map<string, number>> {
  const byMetric = new Map<string, Map<string, number>>();

  for (const multi of payload.multiDailyMetricTimeSeries ?? []) {
    for (const series of multi.dailyMetricTimeSeries ?? []) {
      const metric = series.dailyMetric;
      if (!metric) continue;
      const map = byMetric.get(metric) ?? new Map<string, number>();
      for (const point of series.timeSeries?.datedValues ?? []) {
        const iso = datedToIso(point.date);
        if (!iso) continue;
        map.set(iso, num(point.value));
      }
      byMetric.set(metric, map);
    }
  }

  return byMetric;
}

function sumMetric(byMetric: Map<string, Map<string, number>>, metric: GbpDailyMetric): number {
  const series = byMetric.get(metric);
  if (!series) return 0;
  let total = 0;
  for (const value of series.values()) total += value;
  return total;
}

function metricOnDay(
  byMetric: Map<string, Map<string, number>>,
  metric: GbpDailyMetric,
  date: string
): number {
  return byMetric.get(metric)?.get(date) ?? 0;
}

function eachIsoDate(start: string, end: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export async function fetchGbpAnalytics(
  range: AnalyticsRange,
  custom?: AnalyticsCustomDates
): Promise<GbpAnalyticsReport> {
  const oauth = await getGbpOAuthStatus();
  const locationId = oauth.locationId?.trim();
  if (!locationId) {
    throw new Error('GBP location is not selected. Connect Owner Google login, then Discover locations.');
  }

  const rangeMeta = getGbpDateRange(range, custom);
  const cacheKey = `gbp:${locationId}:${rangeMeta.startDate}:${rangeMeta.endDate}`;
  const cached = getGbpCache<GbpAnalyticsReport>(cacheKey);
  if (cached) {
    return { ...cached, fetchedAt: cached.fetchedAt };
  }

  const payload = await fetchGbpMultiDailyMetrics({
    startDate: rangeMeta.startDate,
    endDate: rangeMeta.endDate,
  });

  const byMetric = collectSeries(payload);

  const impressionsMaps =
    sumMetric(byMetric, 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS') +
    sumMetric(byMetric, 'BUSINESS_IMPRESSIONS_MOBILE_MAPS');
  const impressionsSearch =
    sumMetric(byMetric, 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH') +
    sumMetric(byMetric, 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH');
  const directionRequests = sumMetric(byMetric, 'BUSINESS_DIRECTION_REQUESTS');
  const callClicks = sumMetric(byMetric, 'CALL_CLICKS');
  const websiteClicks = sumMetric(byMetric, 'WEBSITE_CLICKS');
  const conversations = sumMetric(byMetric, 'BUSINESS_CONVERSATIONS');

  const daily: GbpDailyPoint[] = eachIsoDate(rangeMeta.startDate, rangeMeta.endDate).map(
    (date) => ({
      date,
      impressionsMaps:
        metricOnDay(byMetric, 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS', date) +
        metricOnDay(byMetric, 'BUSINESS_IMPRESSIONS_MOBILE_MAPS', date),
      impressionsSearch:
        metricOnDay(byMetric, 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH', date) +
        metricOnDay(byMetric, 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH', date),
      directionRequests: metricOnDay(byMetric, 'BUSINESS_DIRECTION_REQUESTS', date),
      callClicks: metricOnDay(byMetric, 'CALL_CLICKS', date),
      websiteClicks: metricOnDay(byMetric, 'WEBSITE_CLICKS', date),
    })
  );

  const report: GbpAnalyticsReport = {
    configured: true,
    locationId,
    profileUrl: oauth.mapsUri || undefined,
    fetchedAt: new Date().toISOString(),
    range: rangeMeta,
    summary: {
      impressionsMaps,
      impressionsSearch,
      directionRequests,
      callClicks,
      websiteClicks,
      conversations,
      totalImpressions: impressionsMaps + impressionsSearch,
    },
    daily,
  };

  setGbpCache(cacheKey, report, CACHE_TTL_MS);
  return report;
}
