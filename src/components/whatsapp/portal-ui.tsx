'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import { resolveMetaPhoneState } from '@/lib/whatsapp-provider/phone-status';

export function formatMessagingLimit(tier?: string | null) {
  const key = String(tier || '').toUpperCase();
  const map: Record<string, string> = {
    TIER_50: '50 / 24 hrs',
    TIER_250: '250 / 24 hrs',
    TIER_1K: '1,000 / 24 hrs',
    TIER_10K: '10,000 / 24 hrs',
    TIER_100K: '100,000 / 24 hrs',
    TIER_UNLIMITED: 'Unlimited',
  };
  if (map[key]) return map[key];
  if (!tier) return '—';
  return String(tier).replace(/^TIER_/, '').replace(/_/g, ' ');
}

export function phoneDisplayStatus(phone: {
  status?: string | null;
  registration_status?: string | null;
  quality_rating?: string | null;
  raw_json?: Record<string, unknown> | null;
}) {
  return resolveMetaPhoneState(phone);
}

export function templateDisplayStatus(row: { internal_status?: string | null; meta_status?: string | null }) {
  const internal = String(row.internal_status || '').toUpperCase();
  const meta = String(row.meta_status || '').toUpperCase();
  if (internal === 'DRAFT') return { label: 'Draft', tone: 'slate' as const };
  if (internal === 'META_APPROVED' || meta === 'APPROVED') return { label: 'Approved', tone: 'emerald' as const };
  if (internal === 'META_REJECTED' || meta === 'REJECTED') return { label: 'Rejected', tone: 'rose' as const };
  if (internal === 'SUBMITTED_TO_META' || internal === 'META_PENDING' || meta === 'PENDING') return { label: 'Pending', tone: 'amber' as const };
  return { label: meta || internal.replace(/_/g, ' ') || 'Pending', tone: 'amber' as const };
}

export function qualityDot(quality?: string | null) {
  const value = String(quality || '').toUpperCase();
  const color = value.includes('GREEN') ? 'bg-emerald-500' : value.includes('YELLOW') ? 'bg-amber-400' : value.includes('RED') ? 'bg-rose-500' : 'bg-slate-300';
  const label = value.includes('GREEN') ? 'High' : value.includes('YELLOW') ? 'Medium' : value.includes('RED') ? 'Low' : value || 'N/A';
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

export function Pill({
  label,
  tone = 'slate',
}: {
  label: string;
  tone?: 'emerald' | 'amber' | 'rose' | 'slate' | 'sky';
}) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
    sky: 'bg-sky-50 text-sky-700',
    slate: 'bg-slate-100 text-slate-600',
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{label}</span>;
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = 'white',
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: string;
  tone?: 'white' | 'emerald' | 'sky' | 'rose' | 'amber';
}) {
  const tones = {
    white: 'bg-white',
    emerald: 'bg-emerald-50/70',
    sky: 'bg-sky-50/70',
    rose: 'bg-rose-50/70',
    amber: 'bg-amber-50/70',
  };
  const icons = {
    white: 'text-slate-400',
    emerald: 'text-emerald-500',
    sky: 'text-sky-500',
    rose: 'text-rose-500',
    amber: 'text-amber-500',
  };
  return (
    <div className={`rounded-2xl border border-slate-200 ${tones[tone]} px-4 py-4 shadow-sm`}>
      <div className={`flex items-center gap-2 ${icons[tone]}`}>
        <Icon name={icon} size={16} />
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function HelpCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">Need help?</p>
      <p className="mt-1 text-sm text-slate-500">Our team is here to help you at every step.</p>
      <div className="mt-4 space-y-2">
        {[
          { href: 'https://wa.me/919950108555', label: 'Chat on WhatsApp', hint: 'Get quick help from our team', icon: 'ChatBubbleLeftRightIcon' },
          { href: '/contact', label: 'Book a Free Consultation', hint: 'Schedule a call with our experts', icon: 'CalendarDaysIcon' },
          { href: '/portal/wa/support', label: 'View Documentation', hint: 'Step-by-step guides and FAQs', icon: 'BookOpenIcon' },
        ].map((item) => (
          <Link key={item.label} href={item.href} className="flex items-center justify-between rounded-xl px-1 py-2 text-sm hover:bg-slate-50">
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-secondary">
                <Icon name={item.icon} size={16} />
              </span>
              <span>
                <span className="block font-medium text-slate-800">{item.label}</span>
                <span className="block text-xs text-slate-400">{item.hint}</span>
              </span>
            </span>
            <Icon name="ArrowTopRightOnSquareIcon" size={14} className="text-slate-300" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export type SetupItem = { label: string; hint?: string; done: boolean };

export function SetupProgress({ items }: { items: SetupItem[] }) {
  const done = items.filter((item) => item.done).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Icon name="UserCircleIcon" size={18} className="text-secondary" />
          Setup Progress
        </div>
        <p className="text-xs font-medium text-slate-400">
          {done} of {items.length} completed
        </p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-secondary" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-right text-xs font-semibold text-secondary">{pct}%</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-xl px-1 py-1.5">
            <span className="flex items-center gap-2 text-sm text-slate-700">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full ${item.done ? 'bg-emerald-500 text-white' : 'border border-slate-200 text-slate-300'}`}>
                {item.done ? <Icon name="CheckIcon" size={12} /> : null}
              </span>
              {item.label}
            </span>
            <span className="text-xs text-slate-400">{item.done ? item.hint || 'Completed' : item.hint || 'Pending'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PortalModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="font-bricolage text-xl font-bold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-50">
            <Icon name="XMarkIcon" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function initials(name?: string | null) {
  return (
    (name || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'WA'
  );
}

export function formatWhen(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function formatWhenTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).format(date);
}

export function activityCopy(event?: string | null) {
  const key = String(event || '').toLowerCase();
  if (key.includes('sync') || key.includes('import')) return { title: 'Meta account connected', hint: 'Your business account was linked successfully.' };
  if (key.includes('template')) return { title: 'Template synced', hint: 'Templates were imported from Meta.' };
  if (key.includes('phone') || key.includes('number')) return { title: 'Number added', hint: 'A WhatsApp number was added.' };
  if (key.includes('connect') || key.includes('signup')) return { title: 'Workspace created', hint: 'Your workspace is ready.' };
  return { title: event?.replace(/_/g, ' ') || 'Workspace update', hint: 'Latest change from your WhatsApp workspace.' };
}

export function setupItems(input: {
  hasDetails?: boolean;
  hasWaba?: boolean;
  phoneCount?: number;
  templateCount?: number;
  ready?: boolean;
}): SetupItem[] {
  const phones = input.phoneCount || 0;
  const templates = input.templateCount || 0;
  return [
    { label: 'Business Details', done: Boolean(input.hasDetails || input.hasWaba), hint: input.hasDetails || input.hasWaba ? 'Completed' : 'Pending' },
    { label: 'Connect Meta', done: Boolean(input.hasWaba), hint: input.hasWaba ? 'Completed' : 'Pending' },
    { label: 'Add WhatsApp Number', done: phones > 0, hint: phones ? `${phones} number${phones === 1 ? '' : 's'} added` : 'Pending' },
    { label: 'Create & Approve Templates', done: templates > 0, hint: templates ? `${templates} template${templates === 1 ? '' : 's'}` : 'Pending' },
    { label: 'Go Live & Start Messaging', done: Boolean(input.ready && templates > 0), hint: input.ready && templates > 0 ? 'Completed' : 'Pending' },
  ];
}
