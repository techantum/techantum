'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Badge,
  Btn,
  Card,
  EmptyState,
  Field,
  Modal,
  PageTitle,
  SkeletonRows,
  Tabs,
  inputClass,
  maskEmail,
  maskPhone,
} from '@/components/ui';
import { StatusBanner } from '@/components/StatusBanner';
import { api, qualTone, waTone } from '@/lib/api-client';
import { LEAD_PIPELINE, leadStageLabel } from '@/lib/pipeline';

type Lead = Record<string, any>;

export default function LeadsPage() {
  return (
    <Suspense fallback={<SkeletonRows rows={8} />}>
      <LeadsPageInner />
    </Suspense>
  );
}

function LeadsPageInner() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [stage, setStage] = useState('');
  const [source, setSource] = useState('');
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<Lead | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('full_name,phone,email,source,campaign\n');
  const [draft, setDraft] = useState({
    fullName: '',
    phone: '',
    email: '',
    source: 'manual',
    campaign: '',
    consentStatus: 'granted'});
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ pageSize: '100' });
      if (q) params.set('q', q);
      if (stage) params.set('stage', stage);
      if (source) params.set('source', source);
      const body = await api<{ items: Lead[]; total: number }>(`/api/v1/leads?${params}`);
      setItems(body.items || []);
      setTotal(body.total || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (tab === 'hot') return items.filter((l) => l.qualification_status === 'hot' && l.validity_status === 'valid');
    if (tab === 'review') return items.filter((l) => l.validity_status === 'needs_review' || l.qualification_status === 'unqualified');
    return items;
  }, [items, tab]);

  const hotCount = items.filter((l) => l.qualification_status === 'hot').length;
  const reviewCount = items.filter((l) => l.validity_status === 'needs_review').length;

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function createLead(e: FormEvent) {
    e.preventDefault();
    try {
      await api('/api/v1/leads', { method: 'POST', body: JSON.stringify(draft) });
      setShowNew(false);
      setMessage('Lead created');
      setDraft({ fullName: '', phone: '', email: '', source: 'manual', campaign: '', consentStatus: 'granted' });
      await load();
      await api('/api/v1/workers/process', { method: 'POST' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    }
  }

  async function importCsv(e: FormEvent) {
    e.preventDefault();
    try {
      const body = await api('/api/v1/leads/import', { method: 'POST', body: importText, headers: { 'Content-Type': 'text/csv' } });
      setShowImport(false);
      setMessage(`Import complete — ${body.created} created, ${body.merged} merged`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    }
  }

  async function bulkAssign() {
    for (const id of selected) {
      await api(`/api/v1/leads/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ notes: 'Bulk assigned for sales follow-up' })});
    }
    setMessage(`Updated ${selected.length} leads`);
    setSelected([]);
    await load();
  }

  return (
    <div>
      <PageTitle
        title="Leads"
        subtitle="Your workspace-owned customer records. Connected providers are never required."
        actions={
          <>
            <Btn variant="secondary" onClick={() => setShowImport(true)}>
              Import CSV/Excel
            </Btn>
            <a href={`/api/v1/leads/export?${new URLSearchParams({ q, stage, source })}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              Export
            </a>
            <Btn onClick={() => setShowNew(true)}>+ Add lead</Btn>
          </>
        }
      />
      <StatusBanner tone="ok">Showing live leads from schema <b>crm</b>.</StatusBanner>
      {message ? <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</div> : null}
      {error ? <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: 'all', label: `All leads · ${total}` },
          { id: 'hot', label: `Hot & valid · ${hotCount}` },
          { id: 'review', label: `Needs review · ${reviewCount}` },
        ]}
      />

      <div className="mb-3 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, mobile, or lead ID"
          className={`${inputClass} max-w-sm`}
        />
        <select value={source} onChange={(e) => setSource(e.target.value)} className={inputClass + ' w-auto'}>
          <option value="">All sources</option>
          {['manual', 'api', 'csv', 'google_ads', 'meta_leads', 'whatsapp', 'website'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={stage} onChange={(e) => setStage(e.target.value)} className={inputClass + ' w-auto'}>
          <option value="">All stages</option>
          {LEAD_PIPELINE.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <Btn variant="secondary" onClick={load}>
          Apply filters
        </Btn>
      </div>

      {selected.length ? (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl bg-secondary px-4 py-3 text-sm text-white">
          <span>{selected.length} selected</span>
          <button onClick={bulkAssign} className="rounded-lg bg-white/15 px-3 py-1.5 hover:bg-white/25">
            Assign salesperson
          </button>
          <button onClick={() => setSelected([])} className="rounded-lg bg-white/15 px-3 py-1.5 hover:bg-white/25">
            Clear
          </button>
          <span className="text-white/70">Bulk actions: Sales Manager and above</span>
        </div>
      ) : null}

      <Card className="overflow-hidden">
        {loading ? (
          <SkeletonRows />
        ) : filtered.length ? (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.length === filtered.length}
                    onChange={(e) => setSelected(e.target.checked ? filtered.map((l) => l.id) : [])}
                  />
                </th>
                <th className="px-3 py-3">Lead / customer</th>
                <th className="px-3 py-3">Contact</th>
                <th className="px-3 py-3">Source / campaign</th>
                <th className="px-3 py-3">Assigned</th>
                <th className="px-3 py-3">WhatsApp</th>
                <th className="px-3 py-3">Qualification</th>
                <th className="px-3 py-3">AI call</th>
                <th className="px-3 py-3">Stage</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr
                  key={lead.id}
                  className={`border-t border-slate-100 hover:bg-violet-50/40 ${preview?.id === lead.id ? 'bg-violet-50/60' : ''}`}
                  onClick={() => setPreview(lead)}
                >
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.includes(lead.id)} onChange={() => toggle(lead.id)} />
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/leads/${lead.id}`} className="font-medium text-slate-900 hover:text-secondary" onClick={(e) => e.stopPropagation()}>
                      {lead.full_name || 'Unnamed'}
                    </Link>
                    <div className="text-[11px] text-slate-400">
                      {String(lead.id).slice(0, 8)} · {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : ''}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    <div>{maskPhone(lead.phone)}</div>
                    <div className="text-[11px]">{maskEmail(lead.email)}</div>
                  </td>
                  <td className="px-3 py-3 capitalize">
                    {lead.source}
                    <div className="text-[11px] text-slate-400">{lead.campaign || '—'}</div>
                  </td>
                  <td className="px-3 py-3">{lead.assigned_name || 'Unassigned'}</td>
                  <td className="px-3 py-3">
                    <Badge tone={waTone(lead.whatsapp_status)}>{lead.whatsapp_status || 'none'}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={qualTone(lead.validity_status)}>{lead.validity_status}</Badge>
                      <Badge tone={qualTone(lead.qualification_status)}>
                        {lead.qualification_status} · {lead.lead_score ?? 0}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-3 py-3 capitalize">{lead.ai_calling_status || 'none'}</td>
                  <td className="px-3 py-3">{leadStageLabel(lead.stage_code)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState title="No records found" body="Try clearing filters or add your first lead." action={<Btn onClick={() => setShowNew(true)}>Add lead</Btn>} />
        )}
      </Card>

      {preview ? (
        <Card className="mt-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-slate-900">{preview.full_name}</div>
              <div className="mt-1 text-xs text-slate-500">
                Source {preview.source} · Campaign {preview.campaign || '—'} · Consent {preview.consent_status}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone={qualTone(preview.validity_status)}>{preview.validity_status}</Badge>
                <Badge tone={qualTone(preview.qualification_status)}>{preview.qualification_status}</Badge>
                <Badge tone="purple">{leadStageLabel(preview.stage_code)}</Badge>
              </div>
            </div>
            <Link href={`/leads/${preview.id}`} className="text-sm font-medium text-secondary">
              Open full lead detail →
            </Link>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Enrollment validates contacts. No response follows a reminder branch — not an automatic AI call.
          </p>
        </Card>
      ) : null}

      {showNew ? (
        <Modal title="Add lead" onClose={() => setShowNew(false)}>
          <form onSubmit={createLead} className="space-y-3">
            <Field label="Customer name">
              <input className={inputClass} required value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} />
            </Field>
            <Field label="Mobile">
              <input className={inputClass} required value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <input className={inputClass} type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Source">
                <select className={inputClass} value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })}>
                  <option value="manual">Manual entry</option>
                  <option value="website">Website</option>
                  <option value="api">API</option>
                  <option value="csv">CSV</option>
                </select>
              </Field>
              <Field label="Campaign">
                <input className={inputClass} value={draft.campaign} onChange={(e) => setDraft({ ...draft, campaign: e.target.value })} />
              </Field>
            </div>
            <div className="rounded-xl border border-violet-100 bg-violet-50 p-3 text-xs text-violet-800">
              Consent evidence: WhatsApp opt-in set to <b>{draft.consentStatus}</b> for this record.
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="secondary" type="button" onClick={() => setShowNew(false)}>
                Cancel
              </Btn>
              <Btn type="submit">Save new lead</Btn>
            </div>
          </form>
        </Modal>
      ) : null}

      {showImport ? (
        <Modal title="Import leads — Review mapping" onClose={() => setShowImport(false)} wide>
          <form onSubmit={importCsv} className="space-y-3">
            <p className="text-sm text-slate-500">Paste CSV with headers: full_name, phone, email, source, campaign, external_id</p>
            <textarea className={`${inputClass} min-h-[180px] font-mono text-xs`} value={importText} onChange={(e) => setImportText(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Btn variant="secondary" type="button" onClick={() => setShowImport(false)}>
                Cancel
              </Btn>
              <Btn type="submit">Import rows</Btn>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
