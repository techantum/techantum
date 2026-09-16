'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import {
  buildLeadDiscoveryCsv,
  buildLeadDiscoveryTsv,
  displaySearchName,
  downloadTextFile,
  exportBaseName,
} from '@/lib/places/sheet-data';
import type { LeadDiscoveryResult, LeadDiscoveryResultRow, LeadDiscoveryRun, LeadSearchResponse } from '@/lib/places/types';

interface LeadExportMenuProps {
  runId?: string | null;
  run?: Pick<LeadDiscoveryRun, 'name' | 'city' | 'area' | 'segment' | 'created_at'> | null;
  results?: Array<LeadDiscoveryResult | LeadDiscoveryResultRow>;
  preview?: LeadSearchResponse | null;
  searchName?: string;
  size?: 'md' | 'sm';
  onMessage?: (message: string) => void;
  onError?: (message: string) => void;
}

export default function LeadExportMenu({
  runId,
  run,
  results = [],
  preview,
  searchName,
  size = 'md',
  onMessage,
  onError,
}: LeadExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<'excel' | 'sheets' | null>(null);

  const disabled = Boolean(busy) || (!runId && results.length === 0 && !preview);

  const fallbackRun = {
    name: searchName || run?.name || preview?.filters.segment || 'Leads',
    city: run?.city || preview?.filters.city || '',
    area: run?.area || preview?.filters.area || '',
    segment: run?.segment || preview?.filters.segment || '',
    created_at: run?.created_at || new Date().toISOString(),
  };

  const downloadBlob = async (res: Response, fallbackName: string) => {
    const blob = await res.blob();
    const header = res.headers.get('Content-Disposition') || '';
    const match = header.match(/filename="([^"]+)"/);
    const filename = match?.[1] || fallbackName;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportExcel = async () => {
    setBusy('excel');
    setOpen(false);
    try {
      if (runId) {
        const res = await fetch(`/api/admin/lead-discovery/runs/${runId}/export?format=xlsx`);
        if (!res.ok) throw new Error('Excel export failed');
        await downloadBlob(res, `${exportBaseName(fallbackRun)}.xlsx`);
      } else if (preview) {
        const res = await fetch('/api/admin/lead-discovery/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ search: preview, name: searchName, format: 'xlsx' }),
        });
        if (!res.ok) throw new Error('Excel export failed');
        await downloadBlob(res, `${exportBaseName(fallbackRun)}.xlsx`);
      } else {
        throw new Error('Nothing to export yet');
      }
      onMessage?.('Excel file downloaded.');
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Excel export failed');
    } finally {
      setBusy(null);
    }
  };

  const exportGoogleSheet = async () => {
    setBusy('sheets');
    setOpen(false);
    try {
      const rows = results.length ? results : preview?.results ?? [];
      if (!rows.length && runId) {
        const res = await fetch(`/api/admin/lead-discovery/runs/${runId}/export?format=csv`);
        if (!res.ok) throw new Error('Google Sheets export failed');
        await downloadBlob(res, `${exportBaseName(fallbackRun)}.csv`);
      } else if (rows.length) {
        downloadTextFile(
          `${exportBaseName(fallbackRun)}.csv`,
          buildLeadDiscoveryCsv(rows),
          'text/csv;charset=utf-8'
        );
        try {
          await navigator.clipboard.writeText(buildLeadDiscoveryTsv(rows));
        } catch {
          // Clipboard is optional; CSV download still works.
        }
      } else {
        throw new Error('Nothing to export yet');
      }

      window.open('https://docs.google.com/spreadsheets/create', '_blank', 'noopener,noreferrer');
      onMessage?.(
        `CSV downloaded for "${displaySearchName(fallbackRun)}". A new Google Sheet is open — use File → Import, or paste (Ctrl/Cmd+V) the copied table.`
      );
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Google Sheets export failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex items-center gap-2 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 shadow-md shadow-emerald-500/25 hover:brightness-110 disabled:opacity-50 ${
          size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
        }`}
      >
        <Icon name="ArrowDownTrayIcon" size={16} />
        {busy === 'excel' ? 'Preparing Excel…' : busy === 'sheets' ? 'Opening Sheets…' : 'Export'}
        <Icon name="ChevronDownIcon" size={14} />
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-20 cursor-default" aria-label="Close export menu" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-2xl border border-white/60 bg-white/95 shadow-xl shadow-slate-900/10 backdrop-blur">
            <button
              type="button"
              onClick={exportExcel}
              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-indigo-50"
            >
              <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                <Icon name="TableCellsIcon" size={16} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-900">Excel sheet</span>
                <span className="block text-xs text-slate-500">Download .xlsx for Excel or Numbers</span>
              </span>
            </button>
            <button
              type="button"
              onClick={exportGoogleSheet}
              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-emerald-50"
            >
              <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-lime-500 text-white">
                <Icon name="DocumentChartBarIcon" size={16} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-900">Google Sheet</span>
                <span className="block text-xs text-slate-500">Download CSV and open a new sheet</span>
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
