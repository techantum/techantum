'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import AdminAlert from '@/components/admin/AdminAlert';
import { adminInputClass, adminSelectClass, adminTextareaClass } from '@/components/admin/AdminField';
import type { LeadStage, WhatsAppContact, WhatsAppConversation } from '@/lib/whatsapp/types';
import { normalizeQualification, serviceLabel } from '@/lib/whatsapp/qualification';
import { LEAD_PIPELINE, leadStageLabel, leadStageTone, pipelineStage } from '@/lib/whatsapp/pipeline';

type TabId = 'all' | LeadStage;

const AVATAR_TONES = ['bg-violet-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500', 'bg-teal-500'];

function contactLabel(contact?: WhatsAppContact | null) {
  if (!contact) return 'Unknown';
  return (contact.first_name || contact.profile_name || contact.phone_number || 'Unknown').replace(/^~/, '').trim();
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || '?';
}

function avatarTone(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash + seed.charCodeAt(i) * (i + 1)) % AVATAR_TONES.length;
  return AVATAR_TONES[hash];
}

function formatWhen(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatSlot(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function toneClass(tone: string) {
  if (tone === 'emerald') return 'bg-emerald-50 text-emerald-700';
  if (tone === 'sky') return 'bg-sky-50 text-sky-700';
  if (tone === 'violet') return 'bg-violet-50 text-violet-700';
  if (tone === 'amber') return 'bg-amber-50 text-amber-800';
  if (tone === 'green') return 'bg-emerald-50 text-emerald-700';
  if (tone === 'rose') return 'bg-rose-50 text-rose-700';
  return 'bg-slate-100 text-slate-600';
}

function servicesFor(row: WhatsAppConversation) {
  const q = normalizeQualification(row.qualification);
  if (q.service) return [serviceLabel(q.service)];
  if (row.intent && /website|web|mobile/i.test(row.intent)) return [row.intent.replace(/_/g, ' ')];
  return [];
}

function WhatsAppLeadsPageInner() {
  const [rows, setRows] = useState<WhatsAppConversation[]>([]);
  const [search, setSearch] = useState('');
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabId>('all');
  const [range, setRange] = useState('30');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: '', phone: '', email: '', company: '', service: '', note: '' });

  const load = () => {
    setLoading(true);
    fetch(`/api/admin/whatsapp/conversations?search=${encodeURIComponent(search)}`, { cache: 'no-store' })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Failed to load');
        setRows(body);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const next = searchParams?.get('tab');
    if (next && (next === 'all' || LEAD_PIPELINE.some((item) => item.id === next))) {
      setTab(next as TabId);
    }
  }, [searchParams]);

  useEffect(() => {
    load();
  }, []);

  const datedRows = useMemo(() => {
    if (range === 'all') return rows;
    const days = Number(range);
    const from = Date.now() - days * 24 * 60 * 60 * 1000;
    return rows.filter((row) => new Date(row.last_inbound_at || row.created_at || 0).getTime() >= from);
  }, [rows, range]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: datedRows.length };
    for (const item of LEAD_PIPELINE) map[item.id] = datedRows.filter((row) => pipelineStage(row) === item.id).length;
    return map;
  }, [datedRows]);

  const visible = datedRows.filter((row) => tab === 'all' || pipelineStage(row) === tab);

  const updateStatus = async (id: string, lead_stage: string) => {
    setUpdatingId(id);
    setError('');
    try {
      const res = await fetch(`/api/admin/whatsapp/conversations/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_stage }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Status update failed');
      setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...body } : row)));
      setMessage('Lead status updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const createLead = async () => {
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/admin/whatsapp/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to create lead');
      setShowNew(false);
      setDraft({ name: '', phone: '', email: '', company: '', service: '', note: '' });
      setMessage('Lead created.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lead');
    } finally {
      setCreating(false);
    }
  };

  const stats = [
    { id: 'all', label: 'Total Leads', value: counts.all, icon: 'UserGroupIcon' },
    { id: 'NEW', label: 'New Leads', value: counts.NEW || 0, icon: 'ChatBubbleLeftRightIcon' },
    { id: 'IN_DISCUSSION', label: 'In Discussion', value: counts.IN_DISCUSSION || 0, icon: 'ChatBubbleBottomCenterTextIcon' },
    { id: 'QUALIFIED', label: 'Qualified', value: counts.QUALIFIED || 0, icon: 'ClipboardDocumentCheckIcon' },
    { id: 'APPOINTMENT_BOOKED', label: 'Appointment Booked', value: counts.APPOINTMENT_BOOKED || 0, icon: 'CalendarDaysIcon' },
    { id: 'CONVERTED', label: 'Converted', value: counts.CONVERTED || 0, icon: 'CheckCircleIcon' },
  ] as const;

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-md">
            <Icon name="ChatBubbleLeftRightIcon" size={22} />
          </div>
          <div>
            <h1 className="font-bricolage text-2xl font-bold text-slate-900">WhatsApp Leads</h1>
            <p className="text-sm text-slate-500">Manage all WhatsApp conversations, track leads and booked appointments.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
        >
          <Icon name="PlusIcon" size={16} />
          New Lead
        </button>
      </div>

      {message && <AdminAlert>{message}</AdminAlert>}
      {error && <AdminAlert variant="error">{error}</AdminAlert>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <button
            key={stat.id}
            type="button"
            onClick={() => setTab(stat.id === 'all' ? 'all' : (stat.id as LeadStage))}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm hover:border-violet-200"
          >
            <div className="flex items-center gap-2 text-slate-400">
              <Icon name={stat.icon} size={16} />
              <p className="text-[11px] font-semibold uppercase tracking-wide">{stat.label}</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{stat.value}</p>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setTab('all')}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === 'all' ? 'bg-violet-50 text-violet-700' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              All Leads ({counts.all})
            </button>
            {LEAD_PIPELINE.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  tab === item.id ? 'bg-violet-50 text-violet-700' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {item.label} ({counts[item.id] || 0})
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className={`${adminInputClass} max-w-[220px] py-2`}
              placeholder="Search name, phone, tags…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
            />
            <select className={`${adminSelectClass} max-w-[160px] py-2`} value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="all">All time</option>
            </select>
            <a
              href={`/api/admin/whatsapp/leads/export?search=${encodeURIComponent(search)}`}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Icon name="ArrowDownTrayIcon" size={15} />
              Export
            </a>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Last Message</th>
                <th className="px-4 py-3 font-semibold">Service Required</th>
                <th className="px-4 py-3 font-semibold">Lead Status</th>
                <th className="px-4 py-3 font-semibold">Appointment</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const contact = row.whatsapp_contacts as WhatsAppContact | undefined;
                const name = contactLabel(contact);
                const stage = pipelineStage(row);
                const appointment = row.appointment as { id?: string; code?: string; status?: string; scheduled_at?: string } | null;
                return (
                  <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white ${avatarTone(name)}`}>
                          {initials(name)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{name}</p>
                          <p className="text-xs text-slate-500">{contact?.phone_number || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-[240px] truncate text-slate-700">{row.last_message_preview || '—'}</p>
                      <p className="text-[11px] text-slate-400">{formatWhen(row.last_message_at || row.last_inbound_at)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {servicesFor(row).length === 0 && <span className="text-slate-400">—</span>}
                        {servicesFor(row).map((item) => (
                          <span key={item} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            {item}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className={`${adminSelectClass} min-w-[170px] py-1.5 text-xs`}
                        value={stage}
                        disabled={updatingId === row.id}
                        onChange={(e) => updateStatus(row.id, e.target.value)}
                      >
                        {LEAD_PIPELINE.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                      <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${toneClass(leadStageTone(stage))}`}>
                        {leadStageLabel(stage)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {appointment?.id ? (
                        <Link href={`/admin/whatsapp/appointments/${appointment.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-violet-700 hover:underline">
                          <Icon name="CalendarDaysIcon" size={14} />
                          {formatSlot((appointment as { scheduled_at?: string }).scheduled_at) || appointment.code || 'Booked'}
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/whatsapp/inbox?id=${row.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-violet-50 hover:text-violet-700"
                        aria-label="Open chat"
                      >
                        <Icon name="ChatBubbleLeftRightIcon" size={15} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {loading && <p className="p-6 text-sm text-slate-500">Loading leads…</p>}
          {!loading && visible.length === 0 && <p className="p-6 text-sm text-slate-500">No leads in this view.</p>}
        </div>
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">New Lead</h2>
              <button type="button" onClick={() => setShowNew(false)} className="text-slate-400">
                <Icon name="XMarkIcon" size={18} />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input className={adminInputClass} placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <input className={adminInputClass} placeholder="Phone with country code" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
              <input className={adminInputClass} placeholder="Email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
              <input className={adminInputClass} placeholder="Company" value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} />
              <select className={`${adminSelectClass} sm:col-span-2`} value={draft.service} onChange={(e) => setDraft({ ...draft, service: e.target.value })}>
                <option value="">Service required</option>
                <option value="WEBSITE">Website</option>
                <option value="WEB_APPLICATION">Web application</option>
                <option value="MOBILE_APPLICATION">Mobile application</option>
              </select>
              <textarea className={`${adminTextareaClass} sm:col-span-2`} rows={3} placeholder="Internal note" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowNew(false)} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600">
                Cancel
              </button>
              <button
                type="button"
                disabled={creating || !draft.phone.trim()}
                onClick={createLead}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create lead'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WhatsAppLeadsPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-slate-500">Loading leads…</p>}>
      <WhatsAppLeadsPageInner />
    </Suspense>
  );
}
