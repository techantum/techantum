'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Btn,
  Card,
  Field,
  MetricCard,
  Modal,
  PageTitle,
  SkeletonRows,
  Tabs,
  inputClass} from '@/components/ui';
import { StatusBanner } from '@/components/StatusBanner';
import { api } from '@/lib/api-client';

export default function DocumentsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [tab, setTab] = useState('review');
  const [note, setNote] = useState('');
  const [showRequest, setShowRequest] = useState(false);
  const [draft, setDraft] = useState({ leadId: '', docType: 'electricity_bill' });
  const [loading, setLoading] = useState(true);

  async function load(keepId?: string) {
    setLoading(true);
    const [docs, leadRes] = await Promise.all([api('/api/v1/documents'), api('/api/v1/leads?pageSize=100')]);
    setRows(docs || []);
    setLeads(leadRes.items || []);
    const prefer = keepId || selected?.id;
    setSelected((docs || []).find((d: any) => d.id === prefer) || docs?.[0] || null);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const metrics = useMemo(() => {
    return {
      received: rows.length,
      reviewed: rows.filter((r) => ['approved', 'manually_reviewed'].includes(r.status)).length,
      needsReview: rows.filter((r) => ['needs_review', 'uploaded', 'ocr_extracted'].includes(r.status)).length,
      reupload: rows.filter((r) => r.status === 'reupload_requested' || r.status === 'rejected').length,
    };
  }, [rows]);

  const filtered = rows.filter((r) => {
    if (tab === 'review') return ['needs_review', 'uploaded', 'ocr_extracted'].includes(r.status);
    if (tab === 'reupload') return ['reupload_requested', 'rejected'].includes(r.status);
    return true;
  });

  async function create(e: FormEvent) {
    e.preventDefault();
    await api('/api/v1/documents', {
      method: 'POST',
      body: JSON.stringify({
        leadId: draft.leadId,
        docType: draft.docType,
        status: 'needs_review',
        extractedFields: {},
        clarity: 'pending',
      }),
    });
    setShowRequest(false);
    await load();
  }

  async function review(status: string) {
    if (!selected) return;
    await api(`/api/v1/documents/${selected.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reviewNotes: note || `Marked ${status}` })});
    setNote('');
    await load();
  }

  if (loading) return <SkeletonRows rows={8} />;

  return (
    <div>
      <PageTitle
        title="Documents"
        subtitle="Secure document collection, OCR extraction assistance, and human review."
        actions={<Btn onClick={() => setShowRequest(true)}>+ Request document</Btn>}
      />
      <StatusBanner>
        OCR assists review only. This is not official Aadhaar/PAN identity verification. PII is masked in the UI where
        possible.
      </StatusBanner>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Documents received" value={metrics.received} />
        <MetricCard label="Manually reviewed" value={metrics.reviewed} hint="Not official identity verification" tone="ok" />
        <MetricCard label="Needs review" value={metrics.needsReview} tone="warn" />
        <MetricCard label="Re-upload requested" value={metrics.reupload} />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: 'review', label: `Review queue · ${metrics.needsReview}` },
          { id: 'all', label: `All documents · ${metrics.received}` },
          { id: 'reupload', label: `Re-upload · ${metrics.reupload}` },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3">Customer / document</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Review status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelected(row)}
                    className={`cursor-pointer border-t border-slate-100 hover:bg-violet-50/40 ${selected?.id === row.id ? 'bg-violet-50/70' : ''}`}
                  >
                    <td className="px-3 py-3">
                      <div className="font-medium">{row.lead_name || 'Lead'}</div>
                      <div className="text-[11px] text-slate-400">{String(row.id).slice(0, 8)}</div>
                    </td>
                    <td className="px-3 py-3 capitalize">{String(row.doc_type).replaceAll('_', ' ')}</td>
                    <td className="px-3 py-3">
                      <Badge
                        tone={
                          row.status === 'approved'
                            ? 'green'
                            : row.status === 'rejected' || row.status === 'reupload_requested'
                              ? 'rose'
                              : 'amber'
                        }
                      >
                        {row.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {!filtered.length ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-8 text-slate-400">
                      No documents in this queue
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </Card>
          <Card className="p-4 text-sm text-slate-600">
            <h3 className="font-semibold text-slate-900">Collection & security policy</h3>
            <p className="mt-2">Accepted formats: PDF, JPG, PNG · Max 10MB · Retention guidance: 90 days unless longer lawful purpose.</p>
          </Card>
        </div>

        <Card className="p-4">
          <h3 className="font-semibold">Review pane</h3>
          {selected ? (
            <div className="mt-3 space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge tone="sky">OCR extracted</Badge>
                <Badge tone="amber">Manual review required</Badge>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-xs uppercase text-slate-500">Extracted data</div>
                <pre className="mt-2 overflow-auto text-[11px] text-slate-600">
                  {JSON.stringify(selected.ocr_payload || {}, null, 2)}
                </pre>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                Family-member / ownership exceptions must be reviewed by a human. OCR confidence is assistive only.
              </div>
              <Field label="Reviewer note">
                <textarea className={inputClass} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add review notes…" />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Btn
                  variant="secondary"
                  onClick={async () => {
                    const id = selected.id;
                    await api(`/api/v1/documents/${id}/verify`, {
                      method: 'POST',
                      body: JSON.stringify({
                        extracted: selected.ocr_payload?.extracted || {
                          name: selected.lead_name,
                          account_name: selected.lead_name,
                        },
                        clarityScore: 0.62,
                      }),
                    });
                    await load(id);
                  }}
                >
                  Run assistive checks
                </Btn>
                <Btn variant="secondary" onClick={() => review('reupload_requested')}>
                  Request evidence
                </Btn>
                <Btn onClick={() => review('approved')}>Approve manual review</Btn>
                <Btn variant="danger" onClick={() => review('rejected')}>
                  Reject / Re-upload
                </Btn>
              </div>
              {selected.verification?.reasons?.length ? (
                <ul className="list-disc pl-5 text-xs text-amber-800">
                  {selected.verification.reasons.map((r: string) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-slate-400">Select a document</p>
          )}
        </Card>
      </div>

      {showRequest ? (
        <Modal title="Request document" onClose={() => setShowRequest(false)}>
          <form onSubmit={create} className="space-y-3">
            <Field label="Lead">
              <select className={inputClass} required value={draft.leadId} onChange={(e) => setDraft({ ...draft, leadId: e.target.value })}>
                <option value="">Select lead</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.full_name || l.phone}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Document type">
              <select className={inputClass} value={draft.docType} onChange={(e) => setDraft({ ...draft, docType: e.target.value })}>
                <option value="electricity_bill">Electricity bill</option>
                <option value="quotation">Quotation</option>
                <option value="requirement">Requirement brief</option>
                <option value="generic">Generic</option>
              </select>
            </Field>
            <div className="flex justify-end gap-2">
              <Btn variant="secondary" type="button" onClick={() => setShowRequest(false)}>
                Cancel
              </Btn>
              <Btn type="submit">Create review item</Btn>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
