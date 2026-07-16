'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import type { PartnerCatalogCategory, PartnerCatalogPackage } from '@/lib/partner/service-catalog';

function CellValue({ value }: { value: string }) {
  if (value === '✓') {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600">
        <Icon name="CheckIcon" size={14} />
      </span>
    );
  }
  if (value === '—') return <span className="text-slate-300">—</span>;
  return <span className="text-slate-700">{value}</span>;
}

const DIVISION_ICONS: Record<string, string> = {
  'website-development': 'GlobeAltIcon',
  'web-application-development': 'ComputerDesktopIcon',
  'mobile-application-development': 'DevicePhoneMobileIcon',
};

export default function PackageComparison() {
  const [catalog, setCatalog] = useState<PartnerCatalogCategory[]>([]);
  const [activeDivision, setActiveDivision] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [matrix, setMatrix] = useState<{
    packages: PartnerCatalogPackage[];
    rows: { feature_key: string; feature_label: string; values: Record<string, string> }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/partner/packages')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length) {
          setCatalog(data);
          const params = new URLSearchParams(window.location.search);
          const divParam = params.get('division');
          setActiveDivision(
            divParam && data.find((c: PartnerCatalogCategory) => c.slug === divParam)
              ? divParam
              : data[0].slug
          );
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeDivision) return;
    fetch(`/api/partner/packages?division=${encodeURIComponent(activeDivision)}`)
      .then((r) => r.json())
      .then(setMatrix);
  }, [activeDivision]);

  const activeCategory = catalog.find((c) => c.slug === activeDivision);
  const selectedPackage = matrix?.packages.find((p) => p.id === selectedPackageId);

  if (loading) {
    return <p className="text-slate-500 text-sm">Loading packages…</p>;
  }

  if (!catalog.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <p className="text-slate-600">No packages available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bricolage text-2xl font-bold text-slate-900 mb-1">
          Select the Right Plan for Your Client
        </h1>
        <p className="text-sm text-slate-500">
          Compare Website, Web App, and Mobile packages — same plans as on techantum.com/services.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {catalog.map((cat) => (
          <button
            key={cat.slug}
            type="button"
            onClick={() => {
              setActiveDivision(cat.slug);
              setSelectedPackageId('');
            }}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
              activeDivision === cat.slug
                ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200'
            }`}
          >
            <Icon
              name={(DIVISION_ICONS[cat.slug] ?? 'CubeIcon') as 'CubeIcon'}
              size={18}
              className={activeDivision === cat.slug ? 'text-indigo-600' : 'text-slate-400'}
            />
            {cat.name}
          </button>
        ))}
      </div>

      {activeCategory && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-sm text-slate-500">{activeCategory.description}</p>
          {activeCategory.packagesHeadline && (
            <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full shrink-0">
              {activeCategory.packagesHeadline}
            </span>
          )}
        </div>
      )}

      {matrix?.packages && matrix.packages.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr>
                <th className="text-left px-5 py-4 font-semibold text-slate-700 sticky left-0 bg-white border-b border-slate-100 min-w-[180px]">
                  Features
                </th>
                {matrix.packages.map((pkg) => (
                  <th
                    key={pkg.id}
                    className={`text-center px-4 py-4 border-b min-w-[160px] ${
                      pkg.is_highlighted ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="space-y-2">
                      {pkg.is_highlighted && (
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                          Most Popular
                        </span>
                      )}
                      <p className="font-bricolage text-lg font-bold">{pkg.name}</p>
                      <p className={`text-xs font-normal ${pkg.is_highlighted ? 'text-indigo-100' : 'text-slate-500'}`}>
                        {pkg.best_for}
                      </p>
                      {pkg.scope && (
                        <p className={`text-[10px] ${pkg.is_highlighted ? 'text-indigo-100' : 'text-slate-400'}`}>
                          {pkg.scope}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedPackageId(pkg.id)}
                        className={`w-full mt-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          selectedPackageId === pkg.id
                            ? pkg.is_highlighted
                              ? 'bg-white text-indigo-700'
                              : 'bg-indigo-600 text-white'
                            : pkg.is_highlighted
                              ? 'bg-indigo-500 text-white hover:bg-indigo-400 border border-white/30'
                              : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50'
                        }`}
                      >
                        {selectedPackageId === pkg.id ? '✓ Selected' : 'Select Plan'}
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map((row, idx) => (
                <tr key={row.feature_key} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                  <td className="px-5 py-3 font-medium text-slate-700 sticky left-0 bg-inherit border-b border-slate-100">
                    {row.feature_label}
                  </td>
                  {matrix.packages.map((pkg) => (
                    <td
                      key={pkg.id}
                      className={`text-center px-4 py-3 border-b border-slate-100 ${
                        pkg.is_highlighted ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      <CellValue value={row.values[pkg.slug] ?? '—'} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedPackage && selectedPackage.includes.length > 0 && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
          <p className="text-sm font-semibold text-slate-900 mb-2">
            {selectedPackage.name} — What&apos;s Included
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {selectedPackage.includes.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                <Icon name="CheckCircleIcon" size={16} className="text-green-600 shrink-0 mt-0.5" variant="solid" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 rounded-xl border border-slate-200 p-5">
        <div>
          <p className="font-medium text-slate-900">Need something custom?</p>
          <p className="text-sm text-slate-500 mt-0.5">
            Contact us for enterprise or bespoke solutions beyond standard packages.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/partner/support"
            className="px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            Request Custom Solution
          </Link>
          {selectedPackageId && activeDivision ? (
            <Link
              href={`/partner/requirements/new?division=${activeDivision}&plan=${selectedPackage?.slug ?? ''}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Continue to Requirements
              <Icon name="ArrowRightIcon" size={16} />
            </Link>
          ) : (
            <span className="px-5 py-2.5 rounded-lg text-sm text-slate-400 border border-dashed border-slate-300">
              Select a plan to continue
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
