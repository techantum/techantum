'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminStatCard from '@/components/admin/AdminStatCard';
import { formatDuration, formatGa4Date, type AnalyticsRange } from '@/lib/analytics/ga4-format';
import type {
  AnalyticsDailyPoint,
  AnalyticsLocationRow,
  AnalyticsPageRow,
  AnalyticsSummary,
} from '@/lib/analytics/ga4-reports';

interface AnalyticsResponse {
  configured: boolean;
  error?: string;
  propertyId?: string;
  fetchedAt?: string;
  range: { label: string; startDate: string; endDate: string; apiStartDate?: string; apiEndDate?: string };
  summary: AnalyticsSummary | null;
  daily: AnalyticsDailyPoint[];
  pages: AnalyticsPageRow[];
  locations: AnalyticsLocationRow[];
}

const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: 'Last 7 days' },
  { value: 'week', label: 'Last week' },
  { value: '28d', label: 'Last 28 days' },
  { value: 'month', label: 'Last month' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom' },
];

function isoUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultCustomDates() {
  const end = new Date();
  const start = new Date();
  start.setUTCDate(end.getUTCDate() - 6);
  return { from: isoUtc(start), to: isoUtc(end) };
}

function formatNumber(value: number): string {
  return value.toLocaleString('en-IN');
}

export default function WebsiteAnalyticsPage() {
  const defaults = defaultCustomDates();
  const [range, setRange] = useState<AnalyticsRange>('28d');
  const [customFrom, setCustomFrom] = useState(defaults.from);
  const [customTo, setCustomTo] = useState(defaults.to);
  const [customError, setCustomError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const todayIso = isoUtc(new Date());

  const load = useCallback(async (selectedRange: AnalyticsRange, from?: string, to?: string) => {
    setLoading(true);
    setCustomError(null);
    try {
      const params = new URLSearchParams({ range: selectedRange, _: String(Date.now()) });
      if (selectedRange === 'custom' && from && to) {
        params.set('from', from);
        params.set('to', to);
      }
      const res = await fetch(`/api/admin/analytics?${params}`, {
        cache: 'no-store',
      });
      const json = (await res.json()) as AnalyticsResponse;
      setData(json);
      if (!res.ok && json.error) setCustomError(json.error);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (range === 'custom') return;
    load(range);
  }, [load, range]);

  function applyCustomRange() {
    if (!customFrom || !customTo) {
      setCustomError('Choose both a start and end date.');
      return;
    }
    if (customFrom > customTo) {
      setCustomError('Start date must be on or before the end date.');
      return;
    }
    load('custom', customFrom, customTo);
  }

  const chartData =
    data?.daily.map((point) => ({
      ...point,
      label: formatGa4Date(point.date),
    })) ?? [];

  return (
    <div className="w-full space-y-6">
      <AdminPageHeader
        title="Website Analytics"
        action={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRange(option.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  range === option.value
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                }`}
              >
                {option.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                range === 'custom' ? load('custom', customFrom, customTo) : load(range)
              }
              disabled={loading}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:border-indigo-300 disabled:opacity-60"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        }
      />

      {range === 'custom' && (
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-indigo-100 bg-white/80 px-4 py-3 shadow-sm">
          <label className="space-y-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              From
            </span>
            <input
              type="date"
              value={customFrom}
              max={customTo || todayIso}
              onChange={(event) => setCustomFrom(event.target.value)}
              className="rounded-xl border border-indigo-100 bg-white px-3 py-2 text-sm text-foreground shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              To
            </span>
            <input
              type="date"
              value={customTo}
              max={todayIso}
              min={customFrom}
              onChange={(event) => setCustomTo(event.target.value)}
              className="rounded-xl border border-indigo-100 bg-white px-3 py-2 text-sm text-foreground shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
            />
          </label>
          <button
            type="button"
            onClick={applyCustomRange}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            Apply
          </button>
          {customError && <p className="text-sm text-rose-600">{customError}</p>}
        </div>
      )}

      {loading && <p className="text-sm text-muted-foreground">Loading analytics…</p>}

      {!loading && data?.error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-900">
          <p className="font-medium">Analytics unavailable</p>
          <p className="text-sm mt-1">{data.error}</p>
          {!data.configured && (
            <ol className="mt-3 text-sm list-decimal list-inside space-y-1 text-amber-800/90">
              <li>
                In Google Analytics → Admin → Property settings, copy the <strong>Property ID</strong>{' '}
                (numeric, not G-…) into <code className="text-xs">GA4_PROPERTY_ID</code>
              </li>
              <li>
                Create a free service account in{' '}
                <a
                  href="https://console.cloud.google.com/iam-admin/serviceaccounts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Google Cloud Console
                </a>{' '}
                → Keys → Add key → JSON (download once)
              </li>
              <li>
                <strong>No JSON file?</strong> Paste two env vars instead:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
                  <li>
                    <code className="text-xs">GA4_CLIENT_EMAIL</code> — the{' '}
                    <code className="text-xs">client_email</code> from the key
                  </li>
                  <li>
                    <code className="text-xs">GA4_PRIVATE_KEY</code> — the{' '}
                    <code className="text-xs">private_key</code> value (keep{' '}
                    <code className="text-xs">\n</code> line breaks)
                  </li>
                </ul>
                Or paste the whole downloaded file contents into{' '}
                <code className="text-xs">GA4_SERVICE_ACCOUNT_JSON</code>
              </li>
              <li>
                In GA4 Admin → Property access management, add the service account email as{' '}
                <strong>Viewer</strong>
              </li>
              <li>Restart the app after updating environment variables</li>
            </ol>
          )}
          <p className="text-sm mt-3 text-amber-800/90">
            Note: this is only for the admin analytics dashboard. Website tracking uses your G- or GTM ID
            in{' '}
            <Link href="/admin/seo" className="underline font-medium">
              SEO &amp; Marketing
            </Link>
            . You can also view stats directly in{' '}
            <a
              href="https://analytics.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              Google Analytics
            </a>{' '}
            without any API setup.
          </p>
        </div>
      )}

      {!loading && data?.summary && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <AdminStatCard
              label="Active users"
              value={formatNumber(data.summary.activeUsers)}
              hint={data.range.label}
              icon="UsersIcon"
              accent="violet"
            />
            <AdminStatCard
              label="New users"
              value={formatNumber(data.summary.newUsers)}
              icon="UserPlusIcon"
              accent="blue"
            />
            <AdminStatCard
              label="Sessions"
              value={formatNumber(data.summary.sessions)}
              icon="ArrowPathRoundedSquareIcon"
              accent="green"
            />
            <AdminStatCard
              label="Page views"
              value={formatNumber(data.summary.pageViews)}
              icon="EyeIcon"
              accent="amber"
            />
            <AdminStatCard
              label="Avg. engagement"
              value={formatDuration(data.summary.avgEngagementTimeSeconds)}
              icon="ClockIcon"
              accent="rose"
            />
          </div>

          <p className="text-xs text-muted-foreground -mt-2">
            Range: <strong>{data.range.label}</strong>
            {data.range.apiStartDate && data.range.apiEndDate
              ? ` (${data.range.apiStartDate} → ${data.range.apiEndDate})`
              : ` (${data.range.startDate} → ${data.range.endDate})`}
            {data.propertyId ? ` · Property ${data.propertyId}` : ''}
            {data.fetchedAt
              ? ` · Updated ${new Date(data.fetchedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
              : ''}
          </p>

          <AdminSection
            title="Visitors over time"
            description={`${data.range.startDate} → ${data.range.endDate}`}
            accent="violet"
          >
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No traffic data for this period yet.</p>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="usersGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0' }}
                      formatter={(value: number, name: string) => [
                        formatNumber(value),
                        name === 'users' ? 'Users' : name === 'sessions' ? 'Sessions' : 'Page views',
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="users"
                      stroke="#6366f1"
                      fill="url(#usersGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </AdminSection>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <AdminSection title="Top pages" accent="sky">
              {data.pages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No page data yet.</p>
              ) : (
                <div className="overflow-x-auto -mx-5 px-5">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                        <th className="py-2 pr-3 font-medium">Page</th>
                        <th className="py-2 px-3 font-medium text-right">Views</th>
                        <th className="py-2 px-3 font-medium text-right">Users</th>
                        <th className="py-2 pl-3 font-medium text-right">Avg. time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.pages.map((page) => (
                        <tr key={page.path}>
                          <td className="py-2.5 pr-3 font-mono text-xs text-foreground max-w-[220px] truncate">
                            {page.path}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{formatNumber(page.views)}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{formatNumber(page.users)}</td>
                          <td className="py-2.5 pl-3 text-right tabular-nums text-muted-foreground">
                            {formatDuration(page.avgTimeSeconds)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AdminSection>

            <AdminSection title="Visitor locations" accent="emerald">
              {data.locations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No location data yet.</p>
              ) : (
                <div className="overflow-x-auto -mx-5 px-5">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                        <th className="py-2 pr-3 font-medium">Country</th>
                        <th className="py-2 px-3 font-medium">City</th>
                        <th className="py-2 px-3 font-medium text-right">Users</th>
                        <th className="py-2 pl-3 font-medium text-right">Sessions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.locations.map((row, index) => (
                        <tr key={`${row.country}-${row.city}-${index}`}>
                          <td className="py-2.5 pr-3">{row.country}</td>
                          <td className="py-2.5 px-3 text-muted-foreground">{row.city}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{formatNumber(row.users)}</td>
                          <td className="py-2.5 pl-3 text-right tabular-nums">{formatNumber(row.sessions)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AdminSection>
          </div>
        </>
      )}

    </div>
  );
}
