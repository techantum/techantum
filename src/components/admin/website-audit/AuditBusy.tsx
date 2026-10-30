'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

export const SCAN_SESSION_KEY = 'techantum.website-audit.scan';

export type ScanSession = {
  id: string;
  url: string;
  name: string;
};

export function saveScanSession(session: ScanSession) {
  try {
    sessionStorage.setItem(SCAN_SESSION_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

export function readScanSession(): ScanSession | null {
  try {
    const raw = sessionStorage.getItem(SCAN_SESSION_KEY);
    return raw ? JSON.parse(raw) as ScanSession : null;
  } catch {
    return null;
  }
}

export function clearScanSession() {
  try {
    sessionStorage.removeItem(SCAN_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

const STEPS = [
  { key: 'crawl', label: 'Opening the website' },
  { key: 'scan', label: 'Capturing page screenshots' },
  { key: 'checks', label: 'Running SEO, accessibility and layout checks' },
  { key: 'ai', label: 'Web Master Agent reviewing evidence' },
  { key: 'report', label: 'Building the audit report' },
];

function stepIndex(stage?: string) {
  const value = String(stage || '').toLowerCase();
  if (value.includes('ai') || value.includes('agent')) return 3;
  if (value.includes('report') || value.includes('prepar')) return 4;
  if (value.includes('check') || value.includes('seo')) return 2;
  if (value.includes('scan') || value.includes('screenshot') || value.includes('browser')) return 1;
  if (value.includes('crawl') || value.includes('resolv') || value.includes('start')) return 0;
  return -1;
}

export function AuditScanOverlay({
  open,
  url,
  stage,
  pagesScanned,
  maxPages,
  aiEnabled,
}: {
  open: boolean;
  url?: string;
  stage?: string;
  pagesScanned?: number;
  maxPages?: number;
  aiEnabled?: boolean;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => setTick((n) => n + 1), 1400);
    return () => clearInterval(timer);
  }, [open]);
  if (!open) return null;
  const fromStage = stepIndex(stage);
  const active = fromStage >= 0 ? fromStage : tick % STEPS.length;
  const progress = Math.min(96, Math.round(((pagesScanned || 0) / Math.max(1, maxPages || 1)) * 70) + active * 6 + 8);
  return (
    <div className="absolute inset-0 z-[80] flex items-center justify-center overflow-hidden bg-slate-50/92 px-4 py-8 backdrop-blur-[3px]">
      <div className="audit-fade w-full max-w-2xl rounded-[24px] border border-slate-100 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.12)]">
        <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div className="relative overflow-hidden rounded-2xl bg-slate-950 p-4 text-white">
            <div className="audit-orbit pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full border border-white/10" />
            <div className="mb-3 flex items-center gap-2 text-[11px] text-white/70">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="ml-2 truncate">{url || 'https://'}</span>
            </div>
            <div className="relative h-40 overflow-hidden rounded-xl bg-slate-800">
              <div className="absolute inset-x-5 top-5 space-y-2.5">
                <div className="audit-shimmer h-2.5 w-2/3 rounded-full bg-white/15" />
                <div className="audit-shimmer h-2.5 w-1/2 rounded-full bg-white/10" style={{ animationDelay: '120ms' }} />
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="audit-shimmer h-16 rounded-lg bg-white/10" />
                  <div className="audit-shimmer h-16 rounded-lg bg-white/10" style={{ animationDelay: '160ms' }} />
                  <div className="audit-shimmer h-16 rounded-lg bg-white/10" style={{ animationDelay: '280ms' }} />
                </div>
              </div>
              <div className="audit-scan-beam pointer-events-none absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-[#6D5CFF]/70 to-transparent" />
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#6D5CFF] transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Website Audit</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Auditing the website</h2>
            <p className="mt-1 text-sm text-slate-500">
              {aiEnabled === false
                ? 'Deterministic checks first. AI review is off for this run.'
                : 'Rules-first scan, then Web Master Agent reviews evidence — not the whole site.'}
            </p>
            <ul className="mt-4 space-y-2.5">
              {STEPS.map((step, index) => {
                const done = index < active;
                const current = index === active;
                const muted = step.key === 'ai' && aiEnabled === false;
                return (
                  <li key={step.key} className={`flex items-center gap-2.5 text-sm ${current ? 'font-medium text-slate-900' : done ? 'text-slate-600' : 'text-slate-400'}`}>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full ${done ? 'bg-emerald-50 text-emerald-500' : current ? 'bg-[#F3EEFF] text-[#6D5CFF]' : 'bg-slate-100 text-slate-300'}`}>
                      {done ? <Icon name="CheckIcon" size={12} /> : current ? <span className="h-2 w-2 animate-pulse rounded-full bg-current" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                    </span>
                    <span>{muted ? 'Web Master Agent skipped (AI off)' : step.label}</span>
                  </li>
                );
              })}
            </ul>
            {maxPages ? (
              <p className="mt-4 text-xs font-medium text-[#6D5CFF]">{pagesScanned || 0} / {maxPages} pages scanned</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BusyButton({
  busy,
  children,
  className,
  disabled,
  type = 'button',
  onClick,
}: {
  busy?: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  onClick?: () => void;
}) {
  return (
    <button type={type} disabled={disabled || busy} onClick={onClick} className={`inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70 ${className || ''}`}>
      {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
      {children}
    </button>
  );
}

export function PageRedirectLoader({ open, label = 'Loading…' }: { open: boolean; label?: string }) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-white/75 backdrop-blur-[2px]">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-3 shadow-lg">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#6D5CFF] border-t-transparent" />
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </div>
    </div>
  );
}
