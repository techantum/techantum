import { getAnalyticsDateRange, getGa4Config, type AnalyticsRange } from './ga4-config';
import { runGa4Report } from './ga4-client';

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
  propertyId: string;
  fetchedAt: string;
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

export async function fetchWebsiteAnalytics(range: AnalyticsRange): Promise<WebsiteAnalyticsReport> {
  const config = getGa4Config();
  if (!config) {
    throw new Error('GA4 is not configured.');
  }

  const rangeMeta = getAnalyticsDateRange(range);
  const dateRanges = [{ startDate: rangeMeta.apiStartDate, endDate: rangeMeta.apiEndDate }];

  const [summaryRes, dailyRes, pagesRes, locationsRes] = await Promise.all([
    runGa4Report({
      dateRanges,
      metrics: [
        { name: 'activeUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'userEngagementDuration' },
      ],
    }),
    runGa4Report({
      dateRanges,
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
      ],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
      keepEmptyRows: true,
    }),
    runGa4Report({
      dateRanges,
      dimensions: [{ name: 'pagePath' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'activeUsers' },
        { name: 'userEngagementDuration' },
      ],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 25,
    }),
    runGa4Report({
      dateRanges,
      dimensions: [{ name: 'country' }, { name: 'city' }],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 20,
    }),
  ]);

  const summaryRow = summaryRes.rows?.[0]?.metricValues ?? [];
  const activeUsers = num(summaryRow[0]?.value);
  const pageViews = num(summaryRow[3]?.value);
  const engagementSeconds = num(summaryRow[4]?.value);

  // Matches GA4 "Average engagement time" (engagement duration / active users).
  const summary: AnalyticsSummary = {
    activeUsers,
    newUsers: num(summaryRow[1]?.value),
    sessions: num(summaryRow[2]?.value),
    pageViews,
    avgEngagementTimeSeconds: activeUsers > 0 ? engagementSeconds / activeUsers : 0,
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
      const users = num(row.metricValues?.[1]?.value);
      const engagement = num(row.metricValues?.[2]?.value);
      return {
        path: row.dimensionValues?.[0]?.value ?? '/',
        views,
        users,
        avgTimeSeconds: users > 0 ? engagement / users : 0,
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
    propertyId: config.propertyId,
    fetchedAt: new Date().toISOString(),
    range: rangeMeta,
    summary,
    daily,
    pages,
    locations,
  };
}
