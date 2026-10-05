'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import AddWhatsAppNumberDialog from '@/components/whatsapp/AddWhatsAppNumberDialog';
import CreateTemplateDialog from '@/components/whatsapp/CreateTemplateDialog';
import { HelpCard, Pill, SetupProgress, StatTile, formatMessagingLimit, phoneDisplayStatus, qualityDot, setupItems, templateDisplayStatus } from '@/components/whatsapp/portal-ui';

type Phone = {
  id: string;
  phone_number_id?: string;
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
  registration_status?: string;
  messaging_status?: string;
  status?: string;
};

type Template = { id: string; name: string; category?: string; language?: string; internal_status?: string; meta_status?: string };

export default function PortalPhonesPage() {
  const [phones, setPhones] = useState<Phone[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [workspace, setWorkspace] = useState<any>(null);
  const [session, setSession] = useState<any>({});
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('ALL');
  const [addOpen, setAddOpen] = useState(false);
  const [resume, setResume] = useState<{ phoneNumberId: string; display: string } | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    Promise.all([
      fetch('/api/portal/wa/phones').then((r) => r.json()),
      fetch('/api/portal/wa/templates').then((r) => r.json()),
      fetch('/api/portal/wa/dashboard').then((r) => r.json()),
      fetch('/api/public/wa-onboard/session', { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([phoneBody, templateBody, dash, onboard]) => {
        setPhones(phoneBody.rows || []);
        setTemplates(templateBody.rows || []);
        setWorkspace(dash);
        setSession(onboard);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load numbers.'));
  };

  useEffect(load, []);

  const stats = useMemo(() => {
    const active = phones.filter((p) => phoneDisplayStatus(p).label === 'Connected').length;
    const review = phones.filter((p) => phoneDisplayStatus(p).label === 'In Review').length;
    const expired = phones.filter((p) => phoneDisplayStatus(p).label === 'Expired').length;
    return { total: phones.length, active, review, expired };
  }, [phones]);

  const rows = phones.filter((phone) => {
    const hay = `${phone.display_phone_number || ''} ${phone.verified_name || ''}`.toLowerCase();
    const match = !q || hay.includes(q.toLowerCase());
    const display = phoneDisplayStatus(phone).label;
    return match && (status === 'ALL' || display === status);
  });

  const items = setupItems({
    hasDetails: Boolean(session.companyName || workspace?.client?.name),
    hasWaba: workspace?.setup?.hasWaba,
    phoneCount: phones.length,
    templateCount: templates.length,
    ready: workspace?.setup?.ready,
  });

  const continueVerify = (phone: Phone) => {
    if (!phone.phone_number_id) return;
    setResume({ phoneNumberId: phone.phone_number_id, display: phone.display_phone_number || phone.phone_number_id });
    setAddOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-bricolage text-3xl font-bold text-slate-900">WhatsApp Numbers</h1>
          <p className="mt-1 text-sm text-slate-500">Manage all your WhatsApp phone numbers connected to your Business Account.</p>
        </div>
        <button type="button" onClick={() => { setResume(null); setAddOpen(true); }} className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold text-white">
          <Icon name="PlusIcon" size={16} /> Add WhatsApp Number
        </button>
      </div>

      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatTile label="Total Numbers" value={stats.total} hint="This month" icon="PhoneIcon" />
          <StatTile label="Active Numbers" value={stats.active} hint="Ready to send" icon="CheckCircleIcon" tone="emerald" />
          <StatTile label="In Review" value={stats.review} hint="Under verification" icon="ClockIcon" tone="amber" />
          <StatTile label="Expired" value={stats.expired} hint="Needs attention" icon="XCircleIcon" tone="rose" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Get a New WhatsApp Number</p>
          <p className="mt-1 text-xs text-slate-500">Add a number to send messages to your customers.</p>
          <button type="button" onClick={() => { setResume(null); setAddOpen(true); }} className="mt-4 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-white">
            <Icon name="PlusIcon" size={14} /> Add Number
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_0.7fr]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Your WhatsApp Numbers</p>
              <p className="text-xs text-slate-400">View and manage all connected phone numbers</p>
            </div>
            <div className="flex gap-2">
              <label className="relative">
                <Icon name="MagnifyingGlassIcon" size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by number or name" className="rounded-full border border-slate-200 py-2 pl-8 pr-3 text-sm" />
              </label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-full border border-slate-200 px-3 py-2 text-sm">
                <option value="ALL">All Status</option>
                <option value="Connected">Connected</option>
                <option value="In Review">In Review</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3">Phone Number</th>
                  <th className="px-3 py-3">Display Name</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Quality</th>
                  <th className="px-3 py-3">Messaging Limit</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((phone) => {
                  const display = phoneDisplayStatus(phone);
                  return (
                    <tr key={phone.id} className="border-t border-slate-100">
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-900">{phone.display_phone_number || '—'}</p>
                        <p className="text-xs text-slate-400">ID: {phone.phone_number_id || '—'}</p>
                      </td>
                      <td className="px-3 py-4">{phone.verified_name || '—'}</td>
                      <td className="px-3 py-4">
                        <Pill label={display.label} tone={display.tone} />
                      </td>
                      <td className="px-3 py-4">{qualityDot(phone.quality_rating)}</td>
                      <td className="px-3 py-4">{formatMessagingLimit(phone.messaging_status)}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          {display.label !== 'Connected' ? (
                            <button type="button" onClick={() => continueVerify(phone)} className="text-xs font-semibold text-secondary">
                              Continue
                            </button>
                          ) : (
                            <Link href="/portal/wa/messages" className="text-xs font-semibold text-secondary">
                              Manage
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!rows.length ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">
                      No WhatsApp numbers yet. Add one with Meta.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
        <SetupProgress items={items} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_0.7fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Message Templates</p>
              <p className="text-xs text-slate-400">Create, manage and get approval for your message templates from Meta.</p>
            </div>
            <button type="button" onClick={() => setTemplateOpen(true)} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-white">
              <Icon name="PlusIcon" size={12} /> Create Template
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="py-2">Template Name</th>
                  <th className="py-2">Category</th>
                  <th className="py-2">Language</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {templates.slice(0, 4).map((row) => {
                  const status = templateDisplayStatus(row);
                  return (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="py-3 font-medium">{row.name}</td>
                      <td className="py-3">{row.category || '—'}</td>
                      <td className="py-3">{row.language || '—'}</td>
                      <td className="py-3">
                        <Pill label={status.label} tone={status.tone} />
                      </td>
                    </tr>
                  );
                })}
                {!templates.length ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-slate-400">
                      No templates yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
        <HelpCard />
      </div>

      {addOpen ? <AddWhatsAppNumberDialog session={session} resume={resume} onClose={() => setAddOpen(false)} onDone={load} /> : null}
      {templateOpen ? <CreateTemplateDialog onClose={() => setTemplateOpen(false)} onDone={load} /> : null}
    </div>
  );
}
