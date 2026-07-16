'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CategoryWithPackages, PartnerPackage } from '@/lib/partner/catalog';

function CellValue({ value }: { value: string }) {
  if (value === '✓') return <span className="text-green-600 font-semibold">✓</span>;
  if (value === '—') return <span className="text-slate-300">—</span>;
  return <span>{value}</span>;
}

export default function PackageComparison() {
  const [catalog, setCatalog] = useState<CategoryWithPackages[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState('');
  const [matrix, setMatrix] = useState<{
    packages: PartnerPackage[];
    rows: { feature_key: string; feature_label: string; values: Record<string, string> }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/partner/packages')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length) {
          setCatalog(data);
          setActiveCategoryId(data[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeCategoryId) return;
    fetch(`/api/partner/packages?categoryId=${activeCategoryId}`)
      .then((r) => r.json())
      .then(setMatrix);
  }, [activeCategoryId]);

  const activeCategory = catalog.find((c) => c.id === activeCategoryId);

  if (loading) {
    return <p className="text-slate-500 text-sm">Loading packages…</p>;
  }

  if (!catalog.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <p className="text-slate-600">No packages configured yet. Admin can seed packages in CMS.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bricolage text-2xl font-bold text-slate-900 mb-1">Service Packages</h1>
        <p className="text-sm text-slate-500">Compare packages and start a requirement for your client.</p>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {catalog.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategoryId(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeCategoryId === cat.id
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {activeCategory && (
        <p className="text-sm text-slate-500">{activeCategory.description}</p>
      )}

      {/* Package cards */}
      {matrix?.packages && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {matrix.packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`bg-white rounded-xl border p-5 ${
                pkg.is_highlighted ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'
              }`}
            >
              {pkg.is_highlighted && (
                <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600 mb-2 block">
                  Popular
                </span>
              )}
              <h3 className="font-bricolage text-xl font-bold text-slate-900">{pkg.name}</h3>
              <p className="text-xs text-slate-500 mt-1">{pkg.best_for}</p>
              <p className="text-sm text-slate-600 mt-3">{pkg.description}</p>
              <Link
                href={`/partner/requirements/new?category=${activeCategoryId}&package=${pkg.id}`}
                className="mt-4 block text-center bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                Select & Start Requirement
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Comparison table */}
      {matrix?.rows && matrix.rows.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-700 sticky left-0 bg-slate-50">
                  Features
                </th>
                {matrix.packages.map((pkg) => (
                  <th
                    key={pkg.id}
                    className={`text-center px-4 py-3 font-semibold ${
                      pkg.is_highlighted ? 'bg-indigo-600 text-white' : 'text-slate-700'
                    }`}
                  >
                    {pkg.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map((row, idx) => (
                <tr key={row.feature_key} className={idx % 2 === 0 ? '' : 'bg-slate-50/50'}>
                  <td className="px-4 py-2.5 font-medium text-slate-700 sticky left-0 bg-inherit">
                    {row.feature_label}
                  </td>
                  {matrix.packages.map((pkg) => (
                    <td key={pkg.id} className="text-center px-4 py-2.5">
                      <CellValue value={row.values[pkg.slug] ?? '—'} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
