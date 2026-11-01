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
  { key: 'crawl', label: 'Connecting to website' },
  { key: 'scan', label: 'Capturing pages and screenshots' },
  { key: 'checks', label: 'Running technical and SEO checks' },
  { key: 'ai', label: 'Reviewing evidence with Web Master Agent' },
  { key: 'report', label: 'Building the final audit report' },
];

const FOCUS = [
  { label: 'SEO', icon: 'MagnifyingGlassIcon', color: 'text-emerald-500' },
  { label: 'Accessibility', icon: 'UserIcon', color: 'text-sky-500' },
  { label: 'Performance', icon: 'BoltIcon', color: 'text-violet-500' },
  { label: 'Content', icon: 'Square3Stack3DIcon', color: 'text-emerald-500' },
];

function stepIndex(stage?: string, pagesScanned?: number) {
  const value = String(stage || '').toLowerCase();
  if (value.includes('report') || value.includes('prepar') || value.includes('done')) return 4;
  if (value.includes('ai') || value.includes('agent')) return 3;
  if (value.includes('check') || value.includes('seo')) return 2;
  if (value.includes('scan') || value.includes('screenshot') || value.includes('browser')) return (pagesScanned || 0) > 0 ? 2 : 1;
  if (value.includes('crawl') || value.includes('discover') || value.includes('resolv') || value.includes('start')) return 0;
  return -1;
}

function hostLabel(url?: string) {
  try {
    return new URL(String(url || '')).hostname.replace(/^www\./, '');
  } catch {
    return 'website';
  }
}

function formatRemaining(ms: number) {
  const total = Math.max(5, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes <= 0) return `~ ${seconds} sec`;
  return `~ ${minutes} min ${seconds} sec`;
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
  const [startedAt] = useState(() => Date.now());
  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [open]);
  if (!open) return null;
  const fromStage = stepIndex(stage, pagesScanned);
  let active = fromStage >= 0 ? fromStage : 0;
  if (aiEnabled === false && active === 3) active = 4;
  const pageRatio = maxPages ? (pagesScanned || 0) / Math.max(1, maxPages) : 0;
  const progress = Math.min(99, Math.round(pageRatio * 62 + active * 8 + 6));
  const elapsed = Date.now() - startedAt + tick * 0;
  const projected = progress > 12 ? (elapsed / progress) * 100 : 120000;
  const remaining = formatRemaining(Math.max(5000, projected - elapsed));
  const host = hostLabel(url);

  return (
    <section className="audit-fade relative" aria-live="polite" aria-label="Website audit in progress">
      <div className="pointer-events-none absolute inset-x-16 -top-8 h-36 rounded-full bg-violet-200/50 blur-3xl" />
      <div className="relative rounded-[28px] border border-white bg-white px-5 py-7 shadow-[0_24px_70px_rgba(109,92,255,0.10)] sm:px-8 sm:py-8">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.15fr)]">
          <BrowserArt host={host} />
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-[#6D5CFF]">
                <PulseIcon />
              </span>
              <div>
                <h2 className="text-[22px] font-semibold tracking-tight text-slate-900">Auditing website</h2>
                <p className="mt-1 max-w-xl text-sm leading-5 text-slate-500">Scanning pages, checking SEO, accessibility and content, and preparing your website audit report.</p>
              </div>
            </div>
            <ol className="mt-5 space-y-1">
              {STEPS.map((step, index) => {
                const skipped = step.key === 'ai' && aiEnabled === false && index <= active;
                const done = index < active && !skipped;
                const current = index === active;
                const status = skipped ? 'Skipped' : done ? 'Completed' : current ? 'Processing...' : 'Pending';
                return (
                  <li key={step.key} className={`relative flex items-center gap-3 rounded-xl px-2 py-2 ${current ? 'bg-[#F4F0FF]' : ''}`}>
                    {index < STEPS.length - 1 ? <span className="absolute left-[19px] top-8 h-[calc(100%-12px)] w-px bg-slate-200" /> : null}
                    <span className={`relative z-[1] flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${done ? 'border border-emerald-400 bg-white text-emerald-500' : current ? 'bg-[#6D5CFF] text-white' : 'border border-slate-200 bg-white text-slate-300'}`}>
                      {done ? <Icon name="CheckIcon" size={14} /> : current ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                    </span>
                    <span className={`min-w-0 flex-1 text-sm ${current ? 'font-medium text-slate-900' : done ? 'text-slate-700' : 'text-slate-400'}`}>{step.label}</span>
                    <span className={`w-[92px] shrink-0 text-right text-xs ${current ? 'font-medium text-[#6D5CFF]' : 'text-slate-400'}`}>{status}</span>
                  </li>
                );
              })}
            </ol>
            <div className="mt-5 flex items-center gap-4 pl-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-[#C4B5FD] to-[#6D5CFF] transition-all duration-700" style={{ width: `${progress}%` }} />
              </div>
              <span className="w-12 text-right text-[22px] font-semibold tabular-nums text-slate-400">{progress}%</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pl-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="ClockIcon" size={14} />
                Estimated time remaining: <span className="font-semibold text-slate-700">{remaining}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#6D5CFF]">
                <Icon name="SparklesIcon" size={14} />
                Processing website audit...
              </span>
            </div>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {FOCUS.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-white px-4 py-2 text-sm text-slate-600 shadow-[0_6px_18px_rgba(15,23,42,0.05)]">
              <Icon name={item.icon} size={16} className={item.color} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function PulseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M1 9h3l2-5 3 10 2-5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BrowserArt({ host }: { host: string }) {
  return (
    <div className="relative mx-auto h-[300px] w-full max-w-[380px]">
      <div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-100" />
      <div className="absolute left-1/2 top-1/2 h-[268px] w-[268px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-100/80" />
      <svg className="audit-orbit absolute inset-0 h-full w-full" viewBox="0 0 380 300" aria-hidden="true">
        <ellipse cx="190" cy="150" rx="132" ry="52" fill="none" stroke="#C4B5FD" strokeWidth="2" transform="rotate(-18 190 150)" />
      </svg>
      <span className="absolute left-[18%] top-[18%] h-3 w-3 rounded-full bg-emerald-400" />
      <span className="absolute right-[16%] top-[22%] h-3 w-3 rounded-full bg-violet-500" />
      <span className="absolute bottom-[16%] left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-cyan-400" />
      <div className="absolute left-1/2 top-1/2 w-[230px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white shadow-[0_16px_40px_rgba(76,59,207,0.18)]">
        <div className="flex items-center gap-1.5 bg-[#3B2F86] px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-[#FF5F57]" />
          <span className="h-2 w-2 rounded-full bg-[#FEBC2E]" />
          <span className="h-2 w-2 rounded-full bg-[#28C840]" />
          <span className="ml-2 truncate text-[11px] text-white/90">{host}</span>
        </div>
        <div className="space-y-2 bg-[#F7F5FF] p-3">
          <div className="flex h-16 items-center justify-center rounded-lg bg-violet-100 text-violet-300">
            <svg width="54" height="32" viewBox="0 0 54 32" fill="none" aria-hidden="true">
              <path d="M2 26 L16 12 L26 22 L34 14 L52 26" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <circle cx="40" cy="8" r="3" fill="currentColor" />
            </svg>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="h-8 rounded-md bg-violet-200/70" />
            <span className="h-8 rounded-md bg-violet-200/50" />
            <span className="h-8 rounded-md bg-violet-200/80" />
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
