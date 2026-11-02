'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Badge,
  Btn,
  Card,
  EmptyState,
  PageTitle,
  SkeletonRows,
  inputClass,
  maskPhone,
} from '@/components/ui';
import { StatusBanner } from '@/components/StatusBanner';
import { api, qualTone } from '@/lib/api-client';

export default function InboxPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [lead, setLead] = useState<any>(null);
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadList() {
    setLoading(true);
    try {
      const body = await api(`/api/v1/whatsapp/conversations?q=${encodeURIComponent(q)}`);
      setRows(body || []);
      if (!activeId && body?.[0]?.id) setActiveId(body[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: string) {
    const body = await api(`/api/v1/whatsapp/conversations/${id}`);
    setDetail(body.conversation);
    setMessages(body.messages || []);
    if (body.conversation?.lead_id) {
      const leadBody = await api(`/api/v1/leads/${body.conversation.lead_id}`);
      setLead(leadBody.lead);
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  useEffect(() => {
    if (activeId) loadDetail(activeId).catch((e) => setError(e.message));
  }, [activeId]);

  const filtered = useMemo(() => {
    if (filter === 'unread') return rows.filter((r) => r.status === 'open');
    if (filter === 'ai') return rows.filter((r) => r.mode === 'AI');
    return rows;
  }, [rows, filter]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!activeId || !text.trim()) return;
    await api(`/api/v1/whatsapp/conversations/${activeId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body: text })});
    setText('');
    await loadDetail(activeId);
    await loadList();
  }

  async function setMode(mode: string) {
    if (!activeId) return;
    await api(`/api/v1/whatsapp/conversations/${activeId}`, {
      method: 'PATCH',
      body: JSON.stringify({ mode })});
    await loadDetail(activeId);
  }

  return (
    <div>
      <PageTitle
        title="WhatsApp Inbox"
        subtitle="AI qualifies leads after customers reply. Take over anytime to pause automation."
        actions={<Btn onClick={() => loadList()}>Refresh</Btn>}
      />
      <StatusBanner tone="info">
        Conversations and messages are loaded from the CRM database. Outbound WhatsApp uses the configured Meta credentials.
      </StatusBanner>
      {error ? <p className="mb-3 text-rose-600">{error}</p> : null}

      {loading ? (
        <SkeletonRows />
      ) : !rows.length ? (
        <EmptyState
          title="No conversations yet"
          body="Create a lead and send a WhatsApp template, or ingest an inbound webhook."
          action={<Link href="/leads" className="rounded-xl bg-secondary px-3 py-2 text-sm text-white">Go to leads</Link>}
        />
      ) : (
        <div className="grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)_280px]">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 p-3">
              <input className={inputClass} placeholder="Search conversations" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadList()} />
              <div className="mt-2 flex gap-1">
                {[
                  ['all', 'All'],
                  ['unread', 'Open'],
                  ['ai', 'AI'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setFilter(id)}
                    className={`rounded-lg px-2 py-1 text-xs ${filter === id ? 'bg-secondary text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="crm-scroll max-h-[70vh] overflow-y-auto">
              {filtered.map((row) => (
                <button
                  key={row.id}
                  onClick={() => setActiveId(row.id)}
                  className={`block w-full border-b border-slate-100 px-3 py-3 text-left hover:bg-violet-50 ${activeId === row.id ? 'bg-violet-50' : ''}`}
                >
                  <div className="font-medium text-slate-900">{row.full_name || maskPhone(row.phone)}</div>
                  <div className="mt-0.5 text-[11px] capitalize text-slate-500">
                    {row.mode} · {row.stage_code || 'NEW'}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="flex min-h-[70vh] flex-col">
            {detail ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                  <div>
                    <div className="font-semibold text-slate-900">{detail.full_name || detail.phone}</div>
                    <div className="text-xs text-slate-500">Mode {detail.mode} · Status {detail.status}</div>
                  </div>
                  <div className="flex gap-2">
                    <Btn variant="secondary" onClick={() => setMode('HUMAN')}>
                      Take over
                    </Btn>
                    <Btn variant="secondary" onClick={() => setMode('AI')}>
                      Enable AI
                    </Btn>
                  </div>
                </div>
                <div className="crm-scroll flex-1 space-y-3 overflow-y-auto p-4">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        m.direction === 'outbound' ? 'ml-auto bg-secondary text-white' : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {m.payload?.adapter ? (
                        <div className={`mb-1 text-[10px] uppercase tracking-wide ${m.direction === 'outbound' ? 'text-white/70' : 'text-slate-400'}`}>
                          {m.payload.human ? 'Human agent' : `AI · ${m.payload.adapter}`}
                        </div>
                      ) : null}
                      <div>{m.body}</div>
                    </div>
                  ))}
                </div>
                <form onSubmit={send} className="flex gap-2 border-t border-slate-100 p-3">
                  <input className={inputClass} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a reply… Take over to pause AI handling." />
                  <Btn type="submit">Send</Btn>
                </form>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-slate-400">Select a conversation</div>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold text-slate-900">Lead context</h3>
            {lead ? (
              <div className="mt-3 space-y-3 text-sm">
                <div>
                  <div className="font-medium">{lead.full_name}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge tone={qualTone(lead.validity_status)}>{lead.validity_status}</Badge>
                    <Badge tone={qualTone(lead.qualification_status)}>
                      {lead.qualification_status} · {lead.lead_score}/100
                    </Badge>
                  </div>
                </div>
                <div className="text-slate-600">
                  <div>Campaign: {lead.campaign || '—'}</div>
                  <div>Owner: {lead.assigned_name || 'Unassigned'}</div>
                  <div>Stage: {lead.stage_code || 'NEW'}</div>
                  <div>Consent: {lead.consent_status}</div>
                </div>
                <Link href={`/leads/${lead.id}`} className="inline-block text-secondary">
                  Open lead detail →
                </Link>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-400">No lead loaded</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
