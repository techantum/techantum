'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminStatCard from '@/components/admin/AdminStatCard';
import { formatGa4Date, type AnalyticsRange } from '@/lib/analytics/ga4-format';
import type { GbpDailyPoint, GbpSummary } from '@/lib/gbp/reports';

interface GbpResponse {
  configured: boolean;
  error?: string;
  errorCode?: 'quota' | 'permission' | 'not_found' | 'unavailable' | 'unknown';
  locationId?: string;
  profileUrl?: string;
  fetchedAt?: string;
  hasCredentials?: boolean;
  hasLocationId?: boolean;
  range: { label: string; startDate: string; endDate: string };
  summary: GbpSummary | null;
  daily: GbpDailyPoint[];
}

interface DiscoveredLocation {
  accountName: string;
  accountDisplayName: string;
  locationName: string;
  locationId: string;
  title: string;
  address: string;
  mapsUri: string | null;
  placeId: string | null;
}

const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '28d', label: 'Last 28 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom' },
];

function isoUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultCustomDates() {
  const end = new Date();
  const start = new Date();
  start.setUTCDate(end.getUTCDate() - 27);
  return { from: isoUtc(start), to: isoUtc(end) };
}

function formatNumber(value: number): string {
  return value.toLocaleString('en-IN');
}

export default function GbpAnalyticsPage() {
  const defaults = defaultCustomDates();
  const [range, setRange] = useState<AnalyticsRange>('28d');
  const [customFrom, setCustomFrom] = useState(defaults.from);
  const [customTo, setCustomTo] = useState(defaults.to);
  const [customError, setCustomError] = useState<string | null>(null);
  const [data, setData] = useState<GbpResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [locations, setLocations] = useState<DiscoveredLocation[] | null>(null);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
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
      const res = await fetch(`/api/admin/gbp-analytics?${params}`, { cache: 'no-store' });
      const json = (await res.json()) as GbpResponse;
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

  async function discoverLocations() {
    setDiscovering(true);
    setDiscoverError(null);
    try {
      const res = await fetch('/api/admin/gbp-analytics/locations', { cache: 'no-store' });
      const json = await res.json();
      if (!json.ok) {
        setDiscoverError(json.error || 'Could not discover locations');
        setLocations([]);
        return;
      }
      setLocations(json.locations ?? []);
    } catch {
      setDiscoverError('Network error while discovering locations');
      setLocations([]);
    } finally {
      setDiscovering(false);
    }
  }

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
        title="Maps / GBP Analytics"
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

      <p className="text-sm text-muted-foreground -mt-2">
        Aggregated Google Business Profile metrics for Techantum Solutions (searches, Maps views,
        direction requests, calls, website clicks). Individual visitors cannot be identified.
      </p>

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

      {loading && <p className="text-sm text-muted-foreground">Loading Maps analytics…</p>}

      {!loading && data?.error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-900 space-y-3">
          <div>
            <p className="font-medium">
              {data.errorCode === 'quota'
                ? 'Google has not opened GBP API quota for this Cloud project'
                : 'Maps analytics unavailable'}
            </p>
            <p className="text-sm mt-1">{data.error}</p>
            {data.locationId ? (
              <p className="text-xs mt-2 text-amber-800/80 font-mono">
                Location configured: {data.locationId}
                {data.profileUrl ? (
                  <>
                    {' '}
                    ·{' '}
                    <a href={data.profileUrl} target="_blank" rel="noopener noreferrer" className="underline">
                      Open Maps listing
                    </a>
                  </>
                ) : null}
              </p>
            ) : null}
          </div>

          {data.errorCode === 'quota' ? (
            <ol className="text-sm list-decimal list-inside space-y-1 text-amber-800/90">
              <li>
                Open{' '}
                <a
                  href="https://console.cloud.google.com/apis/api/businessprofileperformance.googleapis.com/quotas"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  Cloud Console → Performance API quotas
                </a>{' '}
                for project <code className="text-xs">splendid-flow-501907-q7</code>.
              </li>
              <li>
                If <strong>Requests per minute = 0</strong>, submit{' '}
                <a
                  href="https://support.google.com/business/contact/api_default"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  Application for Basic API Access
                </a>{' '}
                (use an email that is Owner/Manager on the Techantum GBP; include project number{' '}
                <code className="text-xs">992640512723</code>).
              </li>
              <li>
                GBP must be verified and active 60+ days, with techantum.com on the listing.
              </li>
              <li>
                Until approved, check Performance inside{' '}
                <a
                  href="https://business.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  business.google.com
                </a>
                . Avoid Refresh / Discover for a few minutes.
              </li>
            </ol>
          ) : (
            <ol className="text-sm list-decimal list-inside space-y-1 text-amber-800/90">
              <li>
                Open{' '}
                <a
                  href="https://business.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  Google Business Profile
                </a>{' '}
                and confirm Techantum Solutions is claimed &amp; verified for the Madhapur office.
              </li>
              <li>
                In Google Cloud Console, enable <strong>Business Profile Performance API</strong>,{' '}
                <strong>My Business Account Management API</strong>, and{' '}
                <strong>My Business Business Information API</strong>.
              </li>
              <li>
                Add the service account email as <strong>Manager</strong> on the Business Profile
                (Users).
              </li>
              <li>
                Click <strong>Discover locations</strong> below only if{' '}
                <code className="text-xs">GBP_LOCATION_ID</code> is missing.
              </li>
            </ol>
          )}

          <div className="flex flex-wrap gap-2">
            {data.errorCode !== 'quota' && !data.locationId ? (
              <button
                type="button"
                onClick={discoverLocations}
                disabled={discovering}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {discovering ? 'Discovering…' : 'Discover locations'}
              </button>
            ) : null}
            <Link
              href="/admin/seo"
              className="px-3 py-1.5 rounded-lg text-sm font-medium border border-amber-300 bg-white text-amber-900"
            >
              SEO &amp; Marketing
            </Link>
            <a
              href="https://business.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg text-sm font-medium border border-amber-300 bg-white text-amber-900"
            >
              Open GBP Performance
            </a>
          </div>
          {discoverError && <p className="text-sm text-rose-700">{discoverError}</p>}
          {locations && (
            <div className="rounded-lg border border-amber-200 bg-white/70 p-3">
              {locations.length === 0 ? (
                <p className="text-sm">No locations returned yet. Finish Manager access first.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {locations.map((loc) => (
                    <li key={loc.locationName} className="border-b border-amber-100 pb-2 last:border-0">
                      <p className="font-medium">{loc.title}</p>
                      <p className="text-amber-800/80">{loc.address || 'No address'}</p>
                      <p className="font-mono text-xs mt-1">
                        GBP_LOCATION_ID=<strong>{loc.locationId}</strong>
                      </p>
                      {loc.mapsUri ? (
                        <a
                          href={loc.mapsUri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-xs"
                        >
                          Open Maps listing
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {!loading && data?.summary && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
            <AdminStatCard
              label="Total impressions"
              value={formatNumber(data.summary.totalImpressions)}
              hint={data.range.label}
              icon="EyeIcon"
              accent="violet"
            />
            <AdminStatCard
              label="Maps views"
              value={formatNumber(data.summary.impressionsMaps)}
              icon="MapPinIcon"
              accent="blue"
            />
            <AdminStatCard
              label="Search views"
              value={formatNumber(data.summary.impressionsSearch)}
              icon="MagnifyingGlassIcon"
              accent="green"
            />
            <AdminStatCard
              label="Direction requests"
              value={formatNumber(data.summary.directionRequests)}
              icon="ArrowRightCircleIcon"
              accent="amber"
            />
            <AdminStatCard
              label="Call clicks"
              value={formatNumber(data.summary.callClicks)}
              icon="PhoneIcon"
              accent="rose"
            />
            <AdminStatCard
              label="Website clicks"
              value={formatNumber(data.summary.websiteClicks)}
              icon="GlobeAltIcon"
              accent="violet"
            />
          </div>

          <p className="text-xs text-muted-foreground -mt-2">
            Range: <strong>{data.range.label}</strong> ({data.range.startDate} → {data.range.endDate})
            {data.locationId ? ` · Location ${data.locationId}` : ''}
            {data.fetchedAt
              ? ` · Updated ${new Date(data.fetchedAt).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}`
              : ''}
            {data.profileUrl ? (
              <>
                {' '}
                ·{' '}
                <a href={data.profileUrl} target="_blank" rel="noopener noreferrer" className="underline">
                  Open GBP
                </a>
              </>
            ) : null}
          </p>

          <AdminSection
            title="Maps activity over time"
            description="Directions, Maps views, and website clicks from Google Business Profile"
            accent="violet"
          >
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No GBP data for this period yet.</p>
            ) : (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="directionsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="mapsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="directionRequests"
                      name="Directions"
                      stroke="#f59e0b"
                      fill="url(#directionsGradient)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="impressionsMaps"
                      name="Maps views"
                      stroke="#6366f1"
                      fill="url(#mapsGradient)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="websiteClicks"
                      name="Website clicks"
                      stroke="#10b981"
                      fill="transparent"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </AdminSection>

          <AdminSection title="What these numbers mean" accent="sky">
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>
                <strong>Direction requests</strong> — people tapped Directions / started navigation to
                your Madhapur office (not a guaranteed arrival count).
              </li>
              <li>
                <strong>Maps / Search views</strong> — how often your listing appeared on Google Maps
                or Search.
              </li>
              <li>
                <strong>Call / website clicks</strong> — taps on Call or Website from the listing.
              </li>
              <li>
                Data is privacy-safe and aggregated. Google does not expose who searched or drove.
              </li>
            </ul>
          </AdminSection>
        </>
      )}
    </div>
  );
}
