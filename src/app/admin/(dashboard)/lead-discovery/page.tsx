'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminStatCard from '@/components/admin/AdminStatCard';
import AdminAlert from '@/components/admin/AdminAlert';
import LeadExportMenu from '@/components/admin/lead-discovery/LeadExportMenu';
import LeadResultsTable from '@/components/admin/lead-discovery/LeadResultsTable';
import PlacesSearchSelect, { type PlacesOption } from '@/components/admin/lead-discovery/PlacesSearchSelect';
import { countryOptions } from '@/lib/places/countries';
import { catalogAreas, catalogCities, catalogStates, mergePlaceOptions } from '@/lib/places/location-catalog';
import { GOOGLE_PLACE_SEGMENTS } from '@/lib/places/place-types';
import { defaultSearchName, displaySearchName } from '@/lib/places/sheet-data';
import type {
  LeadDiscoveryRun,
  LeadSearchResponse,
  PhoneFilter,
  WebsiteFilter,
} from '@/lib/places/types';

const INPUT =
  'w-full rounded-xl border border-indigo-100 bg-white/90 px-3 py-2.5 text-sm font-inter shadow-sm focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300';

const DEFAULT_COUNTRY: PlacesOption = {
  placeId: 'iso:IN',
  label: 'India',
  description: 'IN',
  types: ['country'],
};

interface PlaceMeta {
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

async function suggestPlaces(body: Record<string, unknown>): Promise<PlacesOption[]> {
  const res = await fetch('/api/admin/lead-discovery/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error || 'Google Maps lookup failed');
  return payload.suggestions ?? [];
}

async function loadPlaceDetails(placeId: string) {
  const res = await fetch('/api/admin/lead-discovery/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ placeId }),
  });
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error || 'Failed to load place details');
  return payload as {
    name: string;
    country: string | null;
    countryCode: string | null;
    state: string | null;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
  };
}

function isoCodeFromOption(option: PlacesOption | null) {
  if (!option) return null;
  if (option.placeId.startsWith('iso:')) return option.placeId.slice(4);
  if (option.description && /^[A-Z]{2}$/.test(option.description)) return option.description;
  return null;
}

export default function LeadDiscoveryPage() {
  const [country, setCountry] = useState<PlacesOption | null>(DEFAULT_COUNTRY);
  const [state, setState] = useState<PlacesOption | null>(null);
  const [city, setCity] = useState<PlacesOption | null>(null);
  const [area, setArea] = useState<PlacesOption | null>(null);
  const [segment, setSegment] = useState<PlacesOption | null>(null);
  const [countryMeta, setCountryMeta] = useState<PlaceMeta>({
    countryCode: 'IN',
    latitude: 20.5937,
    longitude: 78.9629,
  });
  const [stateMeta, setStateMeta] = useState<PlaceMeta>({ countryCode: 'IN', latitude: null, longitude: null });
  const [minRating, setMinRating] = useState('');
  const [hasWebsite, setHasWebsite] = useState<WebsiteFilter>('any');
  const [hasPhone, setHasPhone] = useState<PhoneFilter>('any');
  const [searchName, setSearchName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [preview, setPreview] = useState<LeadSearchResponse | null>(null);
  const [history, setHistory] = useState<LeadDiscoveryRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const cityName = city?.label || '';
  const areaName = area?.label || '';
  const stateName = state?.label || '';
  const countryName = country?.label || '';
  const segmentName = segment?.label || '';
  const suggestedName = defaultSearchName({
    segment: segmentName,
    area: areaName,
    city: cityName,
    state: stateName,
    country: countryName,
  });

  const payload = useMemo(
    () => ({
      country: countryName,
      state: stateName,
      countryCode: countryMeta.countryCode || '',
      city: cityName,
      area: areaName,
      segment: segmentName,
      minRating: minRating ? Number(minRating) : null,
      hasWebsite,
      hasPhone,
      name: (searchName || suggestedName).trim(),
    }),
    [countryName, stateName, countryMeta.countryCode, cityName, areaName, segmentName, minRating, hasWebsite, hasPhone, searchName, suggestedName]
  );

  const countryList = useMemo(() => countryOptions(), []);
  const stateList = useMemo(
    () => catalogStates(countryMeta.countryCode),
    [countryMeta.countryCode]
  );
  const cityList = useMemo(
    () => catalogCities(countryMeta.countryCode, state?.label),
    [countryMeta.countryCode, state?.label]
  );
  const areaList = useMemo(() => catalogAreas(city?.label), [city?.label]);
  const segmentList = useMemo(
    () =>
      GOOGLE_PLACE_SEGMENTS.map((item) => ({
        placeId: item.value,
        label: item.label,
        description: 'Google Maps place type',
        types: [item.value],
      })),
    []
  );

  const fetchCountries = useCallback(async (query: string) => {
    try {
      return mergePlaceOptions(await suggestPlaces({ kind: 'country', query }), countryOptions(query));
    } catch {
      return countryOptions(query);
    }
  }, []);

  const fetchStates = useCallback(
    async (query: string) => {
      const local = catalogStates(countryMeta.countryCode, query);
      try {
        return mergePlaceOptions(
          await suggestPlaces({ kind: 'state', query, regionCode: countryMeta.countryCode }),
          local
        );
      } catch {
        return local;
      }
    },
    [countryMeta.countryCode]
  );

  const fetchCities = useCallback(
    async (query: string) => {
      const local = catalogCities(countryMeta.countryCode, state?.label, query);
      try {
        return mergePlaceOptions(
          await suggestPlaces({ kind: 'city', query, regionCode: countryMeta.countryCode }),
          local
        );
      } catch {
        return local;
      }
    },
    [countryMeta.countryCode, state?.label]
  );

  const fetchAreas = useCallback(
    async (query: string) => {
      const local = catalogAreas(city?.label, query);
      try {
        return mergePlaceOptions(
          await suggestPlaces({ kind: 'area', query, regionCode: countryMeta.countryCode }),
          local
        );
      } catch {
        return local;
      }
    },
    [city?.label, countryMeta.countryCode]
  );

  const fetchSegments = useCallback(async (query: string) => suggestPlaces({ kind: 'segment', query }), []);

  const applyCountry = async (option: PlacesOption | null) => {
    setCountry(option);
    setState(null);
    setCity(null);
    setArea(null);
    setStateMeta({ countryCode: isoCodeFromOption(option), latitude: null, longitude: null });
    if (!option) {
      setCountryMeta({ countryCode: null, latitude: null, longitude: null });
      return;
    }
    const iso = isoCodeFromOption(option);
    if (iso) {
      setCountryMeta({ countryCode: iso, latitude: iso === 'IN' ? 20.5937 : null, longitude: iso === 'IN' ? 78.9629 : null });
      return;
    }
    try {
      const details = await loadPlaceDetails(option.placeId);
      setCountry({ ...option, label: details.country || details.name || option.label });
      setCountryMeta({
        countryCode: details.countryCode,
        latitude: details.latitude,
        longitude: details.longitude,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load country');
    }
  };

  const applyState = async (option: PlacesOption | null) => {
    setState(option);
    setCity(null);
    setArea(null);
    if (!option) {
      setStateMeta({ countryCode: countryMeta.countryCode, latitude: null, longitude: null });
      return;
    }
    if (option.placeId.startsWith('custom:') || option.placeId.startsWith('state:')) {
      setStateMeta({ countryCode: countryMeta.countryCode, latitude: countryMeta.latitude, longitude: countryMeta.longitude });
      return;
    }
    try {
      const details = await loadPlaceDetails(option.placeId);
      setState({ ...option, label: details.state || details.name || option.label });
      setStateMeta({
        countryCode: details.countryCode || countryMeta.countryCode,
        latitude: details.latitude,
        longitude: details.longitude,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load state');
    }
  };

  const applyCity = async (option: PlacesOption | null) => {
    setCity(option);
    setArea(null);
    if (!option || option.placeId.startsWith('custom:') || option.placeId.startsWith('iso:') || option.placeId.startsWith('city:')) return;
    try {
      const details = await loadPlaceDetails(option.placeId);
      setCity({ ...option, label: details.city || details.name || option.label });
    } catch {
      // City label from autocomplete is already usable for Places text search.
    }
  };

  const loadHistory = useCallback(() => {
    fetch('/api/admin/lead-discovery/runs')
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setHistory(data));
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!nameTouched) setSearchName(suggestedName);
  }, [suggestedName, nameTouched]);

  const runSearch = async (save: boolean) => {
    setLoading(true);
    setError('');
    setMessage('');
    setPreview(null);

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
        setMessage(`Saved “${displaySearchName(body.run)}” with ${body.run.result_count} lead(s).`);
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
        body: JSON.stringify({ search: preview, name: payload.name }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Save failed');
      setPreview(null);
      setMessage(`Saved “${displaySearchName(body.run)}” with ${body.run.result_count} lead(s).`);
      loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const canSearch = Boolean(cityName && segmentName);

  return (
    <div className="w-full space-y-6">
      <AdminPageHeader title="Places Search" />

      {message && <AdminAlert variant="success">{message}</AdminAlert>}
      {error && <AdminAlert variant="error">{error}</AdminAlert>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AdminStatCard label="Saved searches" value={history.length} icon="BookmarkIcon" accent="violet" />
        <AdminStatCard label="Preview results" value={preview?.result_count ?? 0} icon="MagnifyingGlassIcon" accent="blue" />
        <AdminStatCard
          label="No website (high priority)"
          value={preview?.results.filter((r) => r.priority === 'high').length ?? 0}
          accent="rose"
          icon="ExclamationTriangleIcon"
        />
      </div>

      <AdminSection title="New search" description="Select country, state, city, and segment. Type in any box to filter the list." accent="sky">
        <div className="space-y-4">
          <label className="text-sm font-medium block">
            Search name
            <input
              value={searchName}
              onChange={(e) => {
                setNameTouched(true);
                setSearchName(e.target.value);
              }}
              className={`mt-1 ${INPUT}`}
              placeholder="e.g. Clinics in Hyderabad — April outreach"
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <PlacesSearchSelect
              label="Country"
              placeholder="Select country"
              value={country}
              onChange={applyCountry}
              fetcher={fetchCountries}
              localOptions={countryList}
              hint="Click to see the full country list, or type to filter."
            />
            <PlacesSearchSelect
              label="State / region"
              placeholder={country ? 'Select state' : 'Select a country first'}
              value={state}
              onChange={applyState}
              fetcher={fetchStates}
              localOptions={stateList}
              disabled={!country}
              hint={stateList.length ? 'Click to see all states, or type to filter.' : 'Type to search states in Google Maps.'}
            />
            <PlacesSearchSelect
              label="City"
              placeholder={state || country ? 'Select city' : 'Select a country first'}
              value={city}
              onChange={applyCity}
              fetcher={fetchCities}
              localOptions={cityList}
              disabled={!country}
              hint={cityList.length ? 'Click to see cities, or type to filter / search more.' : 'Type to search cities in Google Maps.'}
            />
            <PlacesSearchSelect
              label="Area / pincode"
              placeholder={city ? 'Select area or type PIN' : 'Select a city first'}
              value={area}
              onChange={setArea}
              fetcher={fetchAreas}
              localOptions={areaList}
              disabled={!city}
              allowCustom
              hint="Click for local areas, or type a locality / PIN code (e.g. 500081)."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <PlacesSearchSelect
              label="Segment"
              placeholder="Select segment"
              value={segment}
              onChange={setSegment}
              fetcher={fetchSegments}
              localOptions={segmentList}
              allowCustom
              hint="Click to see Google Maps business types, or type to filter."
            />
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
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          Query preview:{' '}
          <span className="font-mono">
            {segmentName && cityName
              ? `${segmentName} in ${[areaName, cityName, stateName, countryName].filter(Boolean).join(', ')}`
              : '—'}
          </span>
        </p>

        <div className="flex flex-wrap gap-3 mt-5">
          <button
            type="button"
            disabled={loading || !canSearch}
            onClick={() => runSearch(false)}
            className="rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
          >
            {loading ? 'Searching…' : 'Preview search'}
          </button>
          <button
            type="button"
            disabled={loading || !canSearch || !payload.name}
            onClick={() => runSearch(true)}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 shadow-md shadow-indigo-500/25 hover:brightness-110 disabled:opacity-50"
          >
            {loading ? 'Working…' : 'Search & save'}
          </button>
          {preview && (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={savePreview}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 shadow-md shadow-emerald-500/20 hover:brightness-110 disabled:opacity-50"
              >
                Save preview
              </button>
              <LeadExportMenu
                preview={preview}
                results={preview.results}
                searchName={payload.name}
                onMessage={setMessage}
                onError={setError}
              />
            </>
          )}
        </div>
      </AdminSection>

      {preview && (
        <AdminSection title="Preview results" description={preview.text_query} accent="violet">
          <LeadResultsTable results={preview.results} />
        </AdminSection>
      )}

      <AdminSection title="Saved searches" description="Every saved Places search. Open details to see only that list." accent="emerald">
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No saved searches yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-emerald-100/80">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-emerald-50 via-white to-cyan-50 text-left text-slate-500">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">When</th>
                  <th className="px-4 py-3 font-semibold">Query</th>
                  <th className="px-4 py-3 font-semibold">Results</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((run) => (
                  <tr key={run.id} className="border-t border-slate-100 hover:bg-emerald-50/40">
                    <td className="px-4 py-3 font-semibold text-slate-900">{displaySearchName(run)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(run.created_at)}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-muted-foreground font-mono">{run.text_query}</p>
                    </td>
                    <td className="px-4 py-3">{run.result_count}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <Link
                          href={`/admin/lead-discovery/${run.id}`}
                          className="text-xs font-semibold text-indigo-600 hover:underline"
                        >
                          Details
                        </Link>
                        <LeadExportMenu size="sm" runId={run.id} run={run} onMessage={setMessage} onError={setError} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>
    </div>
  );
}
