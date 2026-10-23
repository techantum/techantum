'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminAlert from '@/components/admin/AdminAlert';
import Icon from '@/components/ui/AppIcon';
import {
  PartnerPageHero,
  PartnerStatTile,
  partnerBtnPrimary,
  partnerBtnSecondary,
  partnerCard,
  partnerInput,
} from '@/components/partner/PartnerUi';
import LeadExportMenu from '@/components/admin/lead-discovery/LeadExportMenu';
import LeadResultsTable from '@/components/admin/lead-discovery/LeadResultsTable';
import PlacesSearchSelect, { type PlacesOption } from '@/components/admin/lead-discovery/PlacesSearchSelect';
import { countryOptions } from '@/lib/places/countries';
import { catalogAreas, catalogCities, catalogStates, mergePlaceOptions } from '@/lib/places/location-catalog';
import { GOOGLE_PLACE_SEGMENTS } from '@/lib/places/place-types';
import { defaultSearchName, displaySearchName } from '@/lib/places/sheet-data';
import { useLeadDiscoveryPaths } from '@/components/lead-discovery/LeadDiscoveryPaths';
import type {
  LeadDiscoveryRun,
  LeadSearchResponse,
  PhoneFilter,
  WebsiteFilter,
} from '@/lib/places/types';

const ADMIN_INPUT =
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
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

async function suggestPlaces(apiBase: string, body: Record<string, unknown>): Promise<PlacesOption[]> {
  const res = await fetch(`${apiBase}/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error || 'Google Maps lookup failed');
  return payload.suggestions ?? [];
}

async function loadPlaceDetails(apiBase: string, placeId: string) {
  const res = await fetch(`${apiBase}/suggest`, {
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
  const { apiBase, pageBase } = useLeadDiscoveryPaths();
  const isPartner = pageBase.startsWith('/partner');
  const INPUT = isPartner ? partnerInput : ADMIN_INPUT;
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
      return mergePlaceOptions(await suggestPlaces(apiBase, { kind: 'country', query }), countryOptions(query));
    } catch {
      return countryOptions(query);
    }
  }, [apiBase]);

  const fetchStates = useCallback(
    async (query: string) => {
      const local = catalogStates(countryMeta.countryCode, query);
      try {
        return mergePlaceOptions(
          await suggestPlaces(apiBase, { kind: 'state', query, regionCode: countryMeta.countryCode }),
          local
        );
      } catch {
        return local;
      }
    },
    [apiBase, countryMeta.countryCode]
  );

  const fetchCities = useCallback(
    async (query: string) => {
      const local = catalogCities(countryMeta.countryCode, state?.label, query);
      try {
        return mergePlaceOptions(
          await suggestPlaces(apiBase, { kind: 'city', query, regionCode: countryMeta.countryCode }),
          local
        );
      } catch {
        return local;
      }
    },
    [apiBase, countryMeta.countryCode, state?.label]
  );

  const fetchAreas = useCallback(
    async (query: string) => {
      const local = catalogAreas(city?.label, query);
      try {
        return mergePlaceOptions(
          await suggestPlaces(apiBase, { kind: 'area', query, regionCode: countryMeta.countryCode }),
          local
        );
      } catch {
        return local;
      }
    },
    [apiBase, city?.label, countryMeta.countryCode]
  );

  const fetchSegments = useCallback(async (query: string) => suggestPlaces(apiBase, { kind: 'segment', query }), [apiBase]);

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
      const details = await loadPlaceDetails(apiBase, option.placeId);
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
      const details = await loadPlaceDetails(apiBase, option.placeId);
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
      const details = await loadPlaceDetails(apiBase, option.placeId);
      setCity({ ...option, label: details.city || details.name || option.label });
    } catch {
      // City label from autocomplete is already usable for Places text search.
    }
  };

  const loadHistory = useCallback(() => {
    fetch(`${apiBase}/runs`)
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setHistory(data));
  }, [apiBase]);

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
      const url = save ? `${apiBase}/runs` : `${apiBase}/search`;
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
      const res = await fetch(`${apiBase}/runs`, {
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
  const queryText = segmentName && cityName
    ? `${segmentName} in ${[areaName, cityName, stateName, countryName].filter(Boolean).join(', ')}`
    : '';
  const noWebsiteCount = preview?.results.filter((row) => row.priority === 'high').length ?? 0;

  const clearSearch = () => {
    setCountry(DEFAULT_COUNTRY);
    setState(null);
    setCity(null);
    setArea(null);
    setSegment(null);
    setMinRating('');
    setHasWebsite('any');
    setHasPhone('any');
    setNameTouched(false);
    setSearchName('');
    setPreview(null);
    setMessage('');
    setError('');
    setCountryMeta({ countryCode: 'IN', latitude: 20.5937, longitude: 78.9629 });
    setStateMeta({ countryCode: 'IN', latitude: null, longitude: null });
  };

  return (
    <div className="w-full space-y-5">
      {isPartner ? (
        <PartnerPageHero
          title="Lead Discovery"
          description="Find and save businesses using Google Places. Filter by location, segment and more."
        />
      ) : (
        <AdminPageHeader
          title="Lead Discovery"
          description="Find and save businesses using Google Places. Filter by location, segment and more."
        />
      )}

      {message && <AdminAlert variant="success">{message}</AdminAlert>}
      {error && <AdminAlert variant="error">{error}</AdminAlert>}

      {isPartner ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <PartnerStatTile label="Saved searches" value={history.length} icon="BookmarkIcon" tone="sky" />
          <PartnerStatTile label="Preview results" value={preview?.result_count ?? 0} icon="MagnifyingGlassIcon" tone="emerald" />
          <PartnerStatTile label="No website" value={noWebsiteCount} icon="ExclamationTriangleIcon" tone="rose" />
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
            <Icon name="BookmarkIcon" size={22} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Saved searches</p>
            <p className="font-bricolage text-3xl font-bold text-slate-900">{history.length}</p>
            <p className="text-xs text-slate-400">Your saved Places searches</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white">
              <Icon name="MagnifyingGlassIcon" size={22} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700/80">Preview results</p>
              <p className="font-bricolage text-3xl font-bold text-slate-900">{preview?.result_count ?? 0}</p>
              <p className="text-xs text-slate-500">Results from current filters</p>
            </div>
          </div>
          <Icon name="ChartBarIcon" size={28} className="text-emerald-300" />
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-rose-100 bg-rose-50/80 p-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500 text-white">
            <Icon name="ExclamationTriangleIcon" size={22} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-500">No website (high priority)</p>
            <p className="font-bricolage text-3xl font-bold text-slate-900">{noWebsiteCount}</p>
            <p className="text-xs text-slate-500">Businesses without a website</p>
          </div>
        </div>
      </div>
      )}

      <section className={isPartner ? `${partnerCard} p-5` : 'rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'}>
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-50 text-violet-600">
            <Icon name="MagnifyingGlassIcon" size={18} />
          </div>
          <div>
            <h2 className="font-bricolage text-lg font-semibold text-slate-900">Create New Search</h2>
            <p className="text-sm text-slate-500">Set your search criteria below to find businesses. You can preview results before saving.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm font-medium text-slate-700">
            Search Name
            <input
              value={searchName}
              onChange={(event) => {
                setNameTouched(true);
                setSearchName(event.target.value);
              }}
              className={`mt-1 ${INPUT}`}
              placeholder="e.g. Leads - India"
            />
            <span className="mt-1 block text-xs font-normal text-slate-400">Give this search a name to save it later.</span>
          </label>
          <PlacesSearchSelect
            label="Country"
            placeholder="Select country"
            value={country}
            onChange={applyCountry}
            fetcher={fetchCountries}
            localOptions={countryList}
            hint="Select a country to see available states."
          />
          <PlacesSearchSelect
            label="State / Region"
            placeholder={country ? 'Select state' : 'Select a country first'}
            value={state}
            onChange={applyState}
            fetcher={fetchStates}
            localOptions={stateList}
            disabled={!country}
            hint="Choose a state or type to filter."
          />
          <PlacesSearchSelect
            label="City"
            placeholder={country ? 'Select city' : 'Select a country first'}
            value={city}
            onChange={applyCity}
            fetcher={fetchCities}
            localOptions={cityList}
            disabled={!country}
            hint="Choose a city or type to search more."
          />
          <PlacesSearchSelect
            label="Area / Pincode"
            placeholder={city ? 'Select area or type PIN' : 'Select a city first'}
            value={area}
            onChange={setArea}
            fetcher={fetchAreas}
            localOptions={areaList}
            disabled={!city}
            allowCustom
            hint="Enter a local area or PIN code (e.g. 500081)."
          />
          <PlacesSearchSelect
            label="Segment"
            placeholder="Select segment"
            value={segment}
            onChange={setSegment}
            fetcher={fetchSegments}
            localOptions={segmentList}
            allowCustom
            hint="Choose a Google Maps business type."
          />
          <label className="text-sm font-medium text-slate-700">
            Minimum Rating
            <select value={minRating} onChange={(event) => setMinRating(event.target.value)} className={`mt-1 ${INPUT}`}>
              <option value="">Any</option>
              <option value="3">3.0+</option>
              <option value="3.5">3.5+</option>
              <option value="4">4.0+</option>
              <option value="4.5">4.5+</option>
            </select>
            <span className="mt-1 block text-xs font-normal text-slate-400">Filter by minimum Google rating.</span>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Has Website
            <select value={hasWebsite} onChange={(event) => setHasWebsite(event.target.value as WebsiteFilter)} className={`mt-1 ${INPUT}`}>
              <option value="any">Any</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
            <span className="mt-1 block text-xs font-normal text-slate-400">Filter businesses with or without a website.</span>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Has Phone
            <select value={hasPhone} onChange={(event) => setHasPhone(event.target.value as PhoneFilter)} className={`mt-1 ${INPUT}`}>
              <option value="any">Any</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
            <span className="mt-1 block text-xs font-normal text-slate-400">Filter businesses with or without a phone number.</span>
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
          <Icon name="EyeIcon" size={18} className="text-violet-500" />
          <span className="font-semibold text-slate-700">Query preview</span>
          <span>{queryText || 'Your search query will appear here based on the selected filters.'}</span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={loading || !canSearch || !payload.name}
            onClick={() => runSearch(true)}
            className={isPartner ? partnerBtnPrimary : 'inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50'}
          >
            <Icon name="MagnifyingGlassIcon" size={16} />
            {loading ? 'Working…' : 'Search & Save'}
          </button>
          <button
            type="button"
            disabled={loading || !canSearch}
            onClick={() => runSearch(false)}
            className={isPartner ? partnerBtnSecondary : 'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50'}
          >
            <Icon name="EyeIcon" size={16} />
            {loading ? 'Searching…' : 'Preview Search'}
          </button>
          <button type="button" onClick={clearSearch} className="inline-flex items-center gap-2 px-2 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-800">
            <Icon name="ArrowPathIcon" size={16} />
            Clear
          </button>
          {preview && (
            <button
              type="button"
              disabled={loading}
              onClick={savePreview}
              className={isPartner ? `${partnerBtnPrimary} bg-emerald-600 hover:bg-emerald-700` : 'rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50'}
            >
              Save preview
            </button>
          )}
        </div>
      </section>

      {preview && (
        <AdminSection title="Preview results" description={preview.text_query}>
          <div className="mb-3">
            <LeadExportMenu preview={preview} results={preview.results} searchName={payload.name} onMessage={setMessage} onError={setError} />
          </div>
          <LeadResultsTable results={preview.results} />
        </AdminSection>
      )}

      <section className={isPartner ? `${partnerCard} p-5` : 'rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'}>
        <div className="mb-4">
          <h2 className="font-bricolage text-lg font-semibold text-slate-900">Saved Searches</h2>
          <p className="text-sm text-slate-500">Your saved Places searches. Open details to see only that list.</p>
        </div>
        {history.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No saved searches yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Location / Query</th>
                  <th className="px-3 py-3">Saved On</th>
                  <th className="px-3 py-3">Results</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((run) => (
                  <tr key={run.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-2 font-semibold text-slate-900">
                        <Icon
                          name={run.has_website_filter === 'no' ? 'ExclamationTriangleIcon' : 'BookmarkIcon'}
                          size={16}
                          className={run.has_website_filter === 'no' ? 'text-rose-500' : 'text-sky-500'}
                        />
                        {displaySearchName(run)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        <Icon name="MapPinIcon" size={14} className="text-slate-400" />
                        {run.text_query}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-500">{formatDate(run.created_at)}</td>
                    <td className="px-3 py-3 font-semibold text-slate-900">{run.result_count}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <Link href={`${pageBase}/${run.id}`} className={`inline-flex items-center gap-1 text-sm font-semibold hover:underline ${isPartner ? 'text-secondary' : 'text-violet-600'}`}>
                          <Icon name="DocumentTextIcon" size={14} />
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
      </section>
    </div>
  );
}
