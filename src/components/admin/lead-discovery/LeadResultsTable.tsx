import { PRIORITY_LABELS } from '@/lib/places/priority';
import type { LeadDiscoveryResult } from '@/lib/places/types';

const PRIORITY_BADGE: Record<string, string> = {
  high: 'bg-gradient-to-r from-rose-100 to-orange-100 text-rose-800 border border-rose-200',
  medium: 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border border-amber-200',
  normal: 'bg-slate-100 text-slate-700 border border-slate-200',
};

export default function LeadResultsTable({ results }: { results: LeadDiscoveryResult[] }) {
  if (results.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No leads in this search.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-indigo-100/80">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gradient-to-r from-slate-50 via-indigo-50 to-cyan-50 text-left text-slate-500">
            <th className="px-4 py-3 font-semibold">Priority</th>
            <th className="px-4 py-3 font-semibold">Business</th>
            <th className="px-4 py-3 font-semibold">Phone</th>
            <th className="px-4 py-3 font-semibold">Website</th>
            <th className="px-4 py-3 font-semibold">Rating</th>
            <th className="px-4 py-3 font-semibold">Maps</th>
          </tr>
        </thead>
        <tbody>
          {results.map((row) => (
            <tr key={row.place_id} className="border-t border-slate-100 align-top hover:bg-indigo-50/40">
              <td className="px-4 py-3">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[row.priority]}`}>
                  {PRIORITY_LABELS[row.priority as keyof typeof PRIORITY_LABELS]}
                </span>
              </td>
              <td className="px-4 py-3">
                <p className="font-medium text-slate-900">{row.business_name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{row.formatted_address}</p>
              </td>
              <td className="px-4 py-3 text-xs">{row.phone || '—'}</td>
              <td className="px-4 py-3 text-xs max-w-[180px] truncate">
                {row.website_uri ? (
                  <a href={row.website_uri} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                    {row.website_uri.replace(/^https?:\/\//, '')}
                  </a>
                ) : (
                  <span className="text-rose-600 font-medium">No website</span>
                )}
              </td>
              <td className="px-4 py-3 text-xs">
                {row.rating != null ? `${row.rating} (${row.review_count ?? 0})` : '—'}
              </td>
              <td className="px-4 py-3">
                {row.google_maps_uri ? (
                  <a href={row.google_maps_uri} target="_blank" rel="noreferrer" className="text-xs font-medium text-cyan-700 hover:underline">
                    Open
                  </a>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
