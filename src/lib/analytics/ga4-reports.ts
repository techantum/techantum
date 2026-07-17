import type { protos } from '@google-analytics/data';
import { getAnalyticsDateRange, type AnalyticsRange } from './ga4-config';
import { getGa4Client } from './ga4-client';

export interface AnalyticsSummary {
  activeUsers: number;
  newUsers: number;
  sessions: number;
  pageViews: number;
  avgEngagementTimeSeconds: number;
}

export interface AnalyticsDailyPoint {
  date: string;
  users: number;
  sessions: number;
  pageViews: number;
}

export interface AnalyticsPageRow {
  path: string;
  views: number;
  users: number;
  avgTimeSeconds: number;
}

export interface AnalyticsLocationRow {
  country: string;
  city: string;
  users: number;
  sessions: number;
}

export interface WebsiteAnalyticsReport {
  configured: boolean;
  range: ReturnType<typeof getAnalyticsDateRange>;
  summary: AnalyticsSummary;
  daily: AnalyticsDailyPoint[];
  pages: AnalyticsPageRow[];
  locations: AnalyticsLocationRow[];
}

function num(value?: string | null): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function runReport(
  request: protos.google.analytics.data.v1beta.IRunReportRequest
): Promise<protos.google.analytics.data.v1beta.IRunReportResponse> {
  const ga4 = getGa4Client();
  if (!ga4) {
    throw new Error('GA4 is not configured. Set GA4_PROPERTY_ID and GA4_SERVICE_ACCOUNT_JSON.');
  }

  const [response] = await ga4.client.runReport({
    ...request,
    property: ga4.config.property,
  });

  return response;
}

export async function fetchWebsiteAnalytics(range: AnalyticsRange): Promise<WebsiteAnalyticsReport> {
  const rangeMeta = getAnalyticsDateRange(range);
  const dateRange = [{ startDate: rangeMeta.startDate, endDate: rangeMeta.endDate }];

  const [summaryRes, dailyRes, pagesRes, locationsRes] = await Promise.all([
    runReport({
      dateRanges: dateRange,
      metrics: [
        { name: 'activeUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'userEngagementDuration' },
      ],
    }),
    runReport({
      dateRanges: dateRange,
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
      ],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    }),
    runReport({
      dateRanges: dateRange,
      dimensions: [{ name: 'pagePath' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'activeUsers' },
        { name: 'userEngagementDuration' },
      ],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 25,
    }),
    runReport({
      dateRanges: dateRange,
      dimensions: [{ name: 'country' }, { name: 'city' }],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 20,
    }),
  ]);

  const summaryRow = summaryRes.rows?.[0]?.metricValues ?? [];
  const pageViews = num(summaryRow[3]?.value);
  const engagementSeconds = num(summaryRow[4]?.value);

  const summary: AnalyticsSummary = {
    activeUsers: num(summaryRow[0]?.value),
    newUsers: num(summaryRow[1]?.value),
    sessions: num(summaryRow[2]?.value),
    pageViews,
    avgEngagementTimeSeconds: pageViews > 0 ? engagementSeconds / pageViews : 0,
  };

  const daily: AnalyticsDailyPoint[] =
    dailyRes.rows?.map((row) => ({
      date: row.dimensionValues?.[0]?.value ?? '',
      users: num(row.metricValues?.[0]?.value),
      sessions: num(row.metricValues?.[1]?.value),
      pageViews: num(row.metricValues?.[2]?.value),
    })) ?? [];

  const pages: AnalyticsPageRow[] =
    pagesRes.rows?.map((row) => {
      const views = num(row.metricValues?.[0]?.value);
      const engagement = num(row.metricValues?.[2]?.value);
      return {
        path: row.dimensionValues?.[0]?.value ?? '/',
        views,
        users: num(row.metricValues?.[1]?.value),
        avgTimeSeconds: views > 0 ? engagement / views : 0,
      };
    }) ?? [];

  const locations: AnalyticsLocationRow[] =
    locationsRes.rows?.map((row) => ({
      country: row.dimensionValues?.[0]?.value ?? 'Unknown',
      city: row.dimensionValues?.[1]?.value ?? 'Unknown',
      users: num(row.metricValues?.[0]?.value),
      sessions: num(row.metricValues?.[1]?.value),
    })) ?? [];

  return {
    configured: true,
    range: rangeMeta,
    summary,
    daily,
    pages,
    locations,
  };
}
