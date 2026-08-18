'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminStatCard from '@/components/admin/AdminStatCard';
import { PRIORITY_LABELS } from '@/lib/places/priority';
import type {
  LeadDiscoveryResult,
  LeadDiscoveryResultRow,
  LeadDiscoveryRun,
  LeadSearchResponse,
  PhoneFilter,
  WebsiteFilter,
} from '@/lib/places/types';

const PRIORITY_BADGE: Record<string, string> = {
  high: 'bg-rose-100 text-rose-800',
  medium: 'bg-amber-100 text-amber-800',
  normal: 'bg-slate-100 text-slate-700',
};

const INPUT =
  'w-full rounded-lg border border-border bg-input px-3 py-2 text-sm font-inter focus:ring-2 focus:ring-ring focus:border-transparent';

interface ConfigResponse {
  defaultCity: string;
  areas: string[];
  segments: string[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function LeadDiscoveryPage() {
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [city, setCity] = useState('Hyderabad');
  const [area, setArea] = useState('');
  const [segment, setSegment] = useState('');
  const [customArea, setCustomArea] = useState('');
  const [customSegment, setCustomSegment] = useState('');
  const [minRating, setMinRating] = useState('');
  const [hasWebsite, setHasWebsite] = useState<WebsiteFilter>('any');
  const [hasPhone, setHasPhone] = useState<PhoneFilter>('any');
  const [preview, setPreview] = useState<LeadSearchResponse | null>(null);
  const [savedRun, setSavedRun] = useState<LeadDiscoveryRun | null>(null);
  const [savedResults, setSavedResults] = useState<LeadDiscoveryResultRow[]>([]);
  const [history, setHistory] = useState<LeadDiscoveryRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [viewRunId, setViewRunId] = useState<string | null>(null);
  const [viewResults, setViewResults] = useState<LeadDiscoveryResultRow[]>([]);

  const resolvedArea = area === '__custom__' ? customArea.trim() : area;
  const resolvedSegment = segment === '__custom__' ? customSegment.trim() : segment;

  const payload = useMemo(
    () => ({
      city,
      area: resolvedArea,
      segment: resolvedSegment,
      minRating: minRating ? Number(minRating) : null,
      hasWebsite,
      hasPhone,
    }),
    [city, resolvedArea, resolvedSegment, minRating, hasWebsite, hasPhone]
  );

  const loadConfig = useCallback(() => {
    fetch('/api/admin/lead-discovery/config')
      .then((r) => r.json())
      .then((data) => {
        if (data.defaultCity) {
          setConfig(data);
          setCity(data.defaultCity);
          if (data.areas?.length) setArea(data.areas[0]);
          if (data.segments?.length) setSegment(data.segments[0]);
        }
      });
  }, []);

  const loadHistory = useCallback(() => {
    fetch('/api/admin/lead-discovery/runs')
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setHistory(data));
  }, []);

  useEffect(() => {
    loadConfig();
    loadHistory();
  }, [loadConfig, loadHistory]);

  const runSearch = async (save: boolean) => {
    setLoading(true);
    setError('');
    setMessage('');
    setPreview(null);
    setSavedRun(null);
    setSavedResults([]);
    setViewRunId(null);

    try {
      const url = save ? '/api/admin/lead-discovery/runs' : '/api/admin/lead-discovery/search';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Search failed');

      if (save) {
        setSavedRun(body.run);
        setSavedResults(body.results ?? []);
        setPreview(body.run ? { ...payload, text_query: body.run.text_query, raw_count: body.run.raw_count, result_count: body.run.result_count, filters: payload, results: body.results } : null);
        setMessage(`Saved ${body.run.result_count} lead(s) to database.`);
        loadHistory();
      } else {
        setPreview(body as LeadSearchResponse);
        setMessage(`Found ${body.result_count} lead(s) matching your filters (${body.raw_count} raw from Google).`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const savePreview = async () => {
    if (!preview) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/lead-discovery/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ search: preview }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Save failed');
      setSavedRun(body.run);
      setSavedResults(body.results ?? []);
      setMessage(`Saved ${body.run.result_count} lead(s).`);
      loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const openRun = async (runId: string) => {
    setViewRunId(runId);
    setViewResults([]);
    const res = await fetch(`/api/admin/lead-discovery/runs/${runId}`);
    const body = await res.json();
    if (res.ok) {
      setSavedRun(body.run);
      setViewResults(body.results ?? []);
    }
  };

  const displayResults: LeadDiscoveryResult[] = viewRunId
    ? viewResults
    : savedRun
      ? savedResults
      : preview?.results ?? [];

  const highPriorityCount = displayResults.filter((r) => r.priority === 'high').length;

  return (
    <div className="space-y-6 max-w-7xl">
      <AdminPageHeader
        title="Lead Discovery"
        description="Find local business leads via Google Places — filter by area and segment, save to database, and export for field sales."
      />

      {message && (
        <p className="text-sm bg-green-50 text-green-800 border border-green-200 px-4 py-2 rounded-lg">{message}</p>
      )}
      {error && (
        <p className="text-sm bg-rose-50 text-rose-800 border border-rose-200 px-4 py-2 rounded-lg">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AdminStatCard label="Saved searches" value={history.length} />
        <AdminStatCard label="Current results" value={displayResults.length} />
        <AdminStatCard label="No website (high priority)" value={highPriorityCount} accent="rose" />
      </div>

      <AdminSection title="New search" description="Query Google Places and build a filtered lead list.">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="text-sm font-medium">
            City
            <input value={city} onChange={(e) => setCity(e.target.value)} className={`mt-1 ${INPUT}`} />
          </label>
          <label className="text-sm font-medium">
            Area
            <select value={area} onChange={(e) => setArea(e.target.value)} className={`mt-1 ${INPUT}`}>
              {(config?.areas ?? []).map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
              <option value="__custom__">Custom area…</option>
            </select>
          </label>
          {area === '__custom__' && (
            <label className="text-sm font-medium">
              Custom area
              <input value={customArea} onChange={(e) => setCustomArea(e.target.value)} className={`mt-1 ${INPUT}`} placeholder="e.g. Madhapur" />
            </label>
          )}
          <label className="text-sm font-medium">
            Segment
            <select value={segment} onChange={(e) => setSegment(e.target.value)} className={`mt-1 ${INPUT}`}>
              {(config?.segments ?? []).map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
              <option value="__custom__">Custom segment…</option>
            </select>
          </label>
          {segment === '__custom__' && (
            <label className="text-sm font-medium">
              Custom segment
              <input value={customSegment} onChange={(e) => setCustomSegment(e.target.value)} className={`mt-1 ${INPUT}`} placeholder="e.g. Clinics" />
            </label>
          )}
          <label className="text-sm font-medium">
            Minimum rating
            <select value={minRating} onChange={(e) => setMinRating(e.target.value)} className={`mt-1 ${INPUT}`}>
              <option value="">Any</option>
              <option value="3">3.0+</option>
              <option value="3.5">3.5+</option>
              <option value="4">4.0+</option>
              <option value="4.5">4.5+</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Has website
            <select value={hasWebsite} onChange={(e) => setHasWebsite(e.target.value as WebsiteFilter)} className={`mt-1 ${INPUT}`}>
              <option value="any">Any</option>
              <option value="yes">Yes</option>
              <option value="no">No — best website prospects</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Has phone
            <select value={hasPhone} onChange={(e) => setHasPhone(e.target.value as PhoneFilter)} className={`mt-1 ${INPUT}`}>
              <option value="any">Any</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          Query preview: <span className="font-mono">{resolvedSegment && resolvedArea ? `${resolvedSegment} in ${resolvedArea}, ${city}` : '—'}</span>
        </p>

        <div className="flex flex-wrap gap-3 mt-5">
          <button type="button" disabled={loading || !resolvedArea || !resolvedSegment} onClick={() => runSearch(false)} className="bg-card border border-border px-4 py-2 rounded-lg text-sm font-semibold hover:bg-muted disabled:opacity-50">
            {loading ? 'Searching…' : 'Preview search'}
          </button>
          <button type="button" disabled={loading || !resolvedArea || !resolvedSegment} onClick={() => runSearch(true)} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
            {loading ? 'Working…' : 'Search & save'}
          </button>
          {preview && !savedRun && (
            <button type="button" disabled={loading} onClick={savePreview} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
              Save preview to DB
            </button>
          )}
          {savedRun && (
            <a href={`/api/admin/lead-discovery/runs/${savedRun.id}/export`} className="inline-flex items-center bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700">
              Download Excel
            </a>
          )}
        </div>
      </AdminSection>

      {displayResults.length > 0 && (
        <AdminSection
          title="Results"
          description={preview?.text_query || savedRun?.text_query || ''}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-3 pr-3 font-medium">Priority</th>
                  <th className="pb-3 pr-3 font-medium">Business</th>
                  <th className="pb-3 pr-3 font-medium">Phone</th>
                  <th className="pb-3 pr-3 font-medium">Website</th>
                  <th className="pb-3 pr-3 font-medium">Rating</th>
                  <th className="pb-3 font-medium">Maps</th>
                </tr>
              </thead>
              <tbody>
                {displayResults.map((row) => (
                  <tr key={row.place_id} className="border-b border-border/60 align-top">
                    <td className="py-3 pr-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[row.priority]}`}>
                        {PRIORITY_LABELS[row.priority as keyof typeof PRIORITY_LABELS]}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <p className="font-medium">{row.business_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{row.formatted_address}</p>
                    </td>
                    <td className="py-3 pr-3 text-xs">{row.phone || '—'}</td>
                    <td className="py-3 pr-3 text-xs max-w-[180px] truncate">
                      {row.website_uri ? (
                        <a href={row.website_uri} target="_blank" rel="noreferrer" className="text-primary hover:underline">{row.website_uri.replace(/^https?:\/\//, '')}</a>
                      ) : (
                        <span className="text-rose-600 font-medium">No website</span>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-xs">
                      {row.rating != null ? `${row.rating} (${row.review_count ?? 0})` : '—'}
                    </td>
                    <td className="py-3">
                      {row.google_maps_uri ? (
                        <a href={row.google_maps_uri} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Open</a>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminSection>
      )}

      <AdminSection title="Search history" description="Previously saved lead discovery runs.">
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No saved searches yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">When</th>
                  <th className="pb-3 pr-4 font-medium">Query</th>
                  <th className="pb-3 pr-4 font-medium">Results</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((run) => (
                  <tr key={run.id} className="border-b border-border/60">
                    <td className="py-3 pr-4 text-xs text-muted-foreground">{formatDate(run.created_at)}</td>
                    <td className="py-3 pr-4">
                      <p className="font-medium">{run.segment} · {run.area}</p>
                      <p className="text-xs text-muted-foreground font-mono">{run.text_query}</p>
                    </td>
                    <td className="py-3 pr-4">{run.result_count}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => openRun(run.id)} className="text-xs text-primary hover:underline">View</button>
                        <a href={`/api/admin/lead-discovery/runs/${run.id}/export`} className="text-xs text-indigo-600 hover:underline">Excel</a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      <p className="text-xs text-muted-foreground">
        Data from Google Places API. Results are deduplicated by Place ID and sorted with no-website leads first.
      </p>
    </div>
  );
}
