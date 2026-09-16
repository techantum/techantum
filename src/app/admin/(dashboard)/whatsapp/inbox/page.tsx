'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminButton from '@/components/admin/AdminButton';
import AdminBadge from '@/components/admin/AdminBadge';
import AdminAlert from '@/components/admin/AdminAlert';
import { adminSelectClass } from '@/components/admin/AdminField';
import type {
  ConversationStatus,
  LeadStage,
  WhatsAppContact,
  WhatsAppConversation,
  WhatsAppMessage,
} from '@/lib/whatsapp/types';
import {
  formatConversationStory,
  inboxHeadline,
  normalizeQualification,
  qualificationFacts,
} from '@/lib/whatsapp/qualification';

type Detail = {
  conversation: WhatsAppConversation;
  messages: WhatsAppMessage[];
  lead: Record<string, unknown> | null;
  appointment?: { id: string; code: string; status: string; requested_slot_text?: string | null; scheduled_at?: string | null } | null;
};

const LEAD_STAGES: { value: LeadStage; label: string }[] = [
  { value: 'NEW', label: 'New' },
  { value: 'ENGAGED', label: 'Engaged' },
  { value: 'REQUIREMENT_IDENTIFIED', label: 'Requirement identified' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'PROPOSAL_REQUESTED', label: 'Proposal requested' },
  { value: 'HUMAN_FOLLOWUP', label: 'Human follow-up' },
  { value: 'CONVERTED', label: 'Converted' },
  { value: 'LOST', label: 'Lost' },
];

const CONVERSATION_STATUSES: { value: ConversationStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'ARCHIVED', label: 'Archived' },
];

function contactLabel(contact?: WhatsAppContact | null) {
  if (!contact) return 'Unknown';
  return (contact.first_name || contact.profile_name || contact.phone_number || 'Unknown').replace(/^~/, '').trim();
}

function initials(contact?: WhatsAppContact | null) {
  const name = contactLabel(contact).trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || '?';
}

function formatChatTime(iso?: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function previewText(row: WhatsAppConversation) {
  const q = normalizeQualification(row.qualification);
  const headline = inboxHeadline(q);
  if (headline) return headline;
  if (q.service) return q.service.replace(/_/g, ' ').toLowerCase();
  if (q.prospect === 'PROSPECT') return 'Qualified prospect';
  if (q.prospect === 'NOT_PROSPECT') return 'Not a current prospect';
  if (q.prospect === 'NURTURE') return 'Nurture — follow up';
  return row.lead_stage.replace(/_/g, ' ').toLowerCase();
}

function prospectMeta(row?: WhatsAppConversation | null) {
  const q = normalizeQualification(row?.qualification);
  if (!q.prospect || q.prospect === 'UNKNOWN') return null;
  if (q.prospect === 'PROSPECT') return { label: 'Prospect: Yes', variant: 'green' as const, why: q.prospect_reason };
  if (q.prospect === 'NOT_PROSPECT') return { label: 'Prospect: No', variant: 'rose' as const, why: q.prospect_reason };
  return { label: 'Prospect: Nurture', variant: 'amber' as const, why: q.prospect_reason };
}

function isOutgoing(sender: string) {
  return sender === 'AI' || sender === 'STAFF';
}

function storySteps(story: string, brief?: string) {
  return story
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^requirement in their words:/i.test(line))
    .map((line) => {
      if (/hello! i would like to inquire about techantum/i.test(line)) return 'Opened the chat from the website.';
      return line.replace(/^opened with:\s*/i, 'Opened with: ');
    })
    .filter((line, index, all) => all.indexOf(line) === index)
    .filter((line) => !brief || !line.toLowerCase().includes(brief.trim().toLowerCase()));
}

function FactChip({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'green' | 'amber' | 'rose' }) {
  const tones = {
    slate: 'bg-[#f6f7f8] text-[#111b21]',
    green: 'bg-emerald-50 text-emerald-800',
    amber: 'bg-amber-50 text-amber-900',
    rose: 'bg-rose-50 text-rose-800',
  };
  return (
    <div className={`rounded-lg px-3 py-2 ${tones[tone]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#667781]">{label}</p>
      <p className="mt-0.5 text-sm font-medium leading-5">{value}</p>
    </div>
  );
}

export default function WhatsAppInboxPage() {
  const [rows, setRows] = useState<WhatsAppConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const threadRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);

  const loadList = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    fetch(`/api/admin/whatsapp/conversations?search=${encodeURIComponent(search)}`, { cache: 'no-store' })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Failed to load');
        setRows(body);
      })
      .catch((err) => {
        if (!silent) setError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => setLoading(false));
  }, [search]);

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/whatsapp/conversations/${id}`, { cache: 'no-store' });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Failed to load conversation');
    setDetail(body);
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setShowInfo(false);
    setDraft('');
    nearBottomRef.current = true;
    loadDetail(selectedId).catch((err) => setError(err instanceof Error ? err.message : 'Failed to load conversation'));
  }, [selectedId, loadDetail]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      loadList(true);
      if (selectedId) loadDetail(selectedId).catch(() => undefined);
    };
    const timer = window.setInterval(refresh, 3500);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [loadList, loadDetail, selectedId]);

  useEffect(() => {
    const el = threadRef.current;
    if (el && nearBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [detail?.messages.length, selectedId]);

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) || detail?.conversation || null,
    [rows, selectedId, detail]
  );
  const contact = (detail?.conversation.whatsapp_contacts || selected?.whatsapp_contacts) as WhatsAppContact | undefined;
  const qualification = normalizeQualification(detail?.conversation.qualification || selected?.qualification);
  const facts = qualificationFacts(qualification);
  const story = formatConversationStory(qualification, detail?.messages || []);
  const brief = facts.find((row) => row.label === 'What they want')?.value;
  const snapshot = facts.filter((row) => ['Service', 'Requirement', 'Call'].includes(row.label));
  const steps = storySteps(story, brief);
  const prospect = prospectMeta(selected);

  const action = async (path: string, success: string) => {
    if (!selectedId) return;
    setError('');
    const res = await fetch(`/api/admin/whatsapp/conversations/${selectedId}/${path}`, { method: 'POST' });
    const body = await res.json();
    if (!res.ok) return setError(body.error || 'Action failed');
    setMessage(success);
    loadList();
    loadDetail(selectedId).catch(() => undefined);
  };

  const updateStatus = async (patch: { lead_stage?: string; status?: string }) => {
    if (!selectedId) return;
    setError('');
    const res = await fetch(`/api/admin/whatsapp/conversations/${selectedId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const body = await res.json();
    if (!res.ok) return setError(body.error || 'Status update failed');
    setMessage('Status updated.');
    setRows((prev) => prev.map((row) => (row.id === selectedId ? { ...row, ...body } : row)));
    loadDetail(selectedId).catch(() => undefined);
  };

  const sendMessage = async () => {
    if (!selectedId || !draft.trim()) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/whatsapp/conversations/${selectedId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: draft }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Send failed');
      setDraft('');
      nearBottomRef.current = true;
      await loadDetail(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full space-y-3">
      <AdminPageHeader
        title="WhatsApp Inbox"
        description="Chats with customers. Select a conversation to reply."
        action={
          <a href="/admin/whatsapp/chats">
            <AdminButton>Chats list</AdminButton>
          </a>
        }
      />
      {message && <AdminAlert>{message}</AdminAlert>}
      {error && <AdminAlert variant="error">{error}</AdminAlert>}

      <div className="flex h-[calc(100vh-11rem)] min-h-[560px] overflow-hidden rounded-xl border border-[#d1d7db] bg-white shadow-sm">
        <aside className={`${selectedId ? 'hidden md:flex' : 'flex'} w-full md:w-[360px] shrink-0 flex-col border-r border-[#e9edef] bg-white`}>
          <div className="flex items-center gap-3 bg-[#f0f2f5] px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00a884] text-sm font-semibold text-white">
              T
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#111b21]">Techantum chats</p>
              <p className="flex items-center gap-1.5 text-[11px] text-[#667781]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00a884] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00a884]" />
                </span>
                Live · {rows.length} conversation{rows.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <div className="bg-[#f0f2f5] px-3 pb-3">
            <input
              className="w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-[#111b21] outline-none ring-1 ring-transparent placeholder:text-[#667781] focus:ring-[#00a884]"
              placeholder="Search or start a new chat"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadList()}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && <p className="p-4 text-sm text-[#667781]">Loading chats…</p>}
            {!loading && rows.length === 0 && <p className="p-4 text-sm text-[#667781]">No conversations yet.</p>}
            {rows.map((row) => {
              const c = row.whatsapp_contacts as WhatsAppContact | undefined;
              const active = row.id === selectedId;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  className={`flex w-full items-center gap-3 border-b border-[#f0f2f5] px-3 py-3 text-left hover:bg-[#f5f6f6] ${
                    active ? 'bg-[#f0f2f5]' : 'bg-white'
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${
                      row.mode === 'HUMAN' ? 'bg-[#54656f]' : 'bg-[#00a884]'
                    }`}
                  >
                    {initials(c)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-[15px] font-medium text-[#111b21]">{contactLabel(c)}</p>
                      <span className="shrink-0 text-[11px] text-[#667781]">{formatChatTime(row.last_inbound_at)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {prospectMeta(row) && (
                        <span
                          className={`shrink-0 rounded px-1 py-px text-[10px] font-semibold ${
                            prospectMeta(row)?.variant === 'green'
                              ? 'bg-emerald-50 text-emerald-700'
                              : prospectMeta(row)?.variant === 'rose'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-amber-50 text-amber-800'
                          }`}
                        >
                          {prospectMeta(row)?.label.replace('Prospect: ', '')}
                        </span>
                      )}
                      <p className="truncate text-[13px] text-[#667781]">{previewText(row)}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className={`${selectedId ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col bg-[#efeae2]`}>
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center bg-[#f0f2f5] text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#00a884] text-2xl font-bold text-white">
                T
              </div>
              <p className="text-lg font-medium text-[#41525d]">Techantum WhatsApp</p>
              <p className="mt-1 max-w-sm text-sm text-[#667781]">Select a chat from the left to view messages, summary and status.</p>
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 bg-[#f0f2f5] px-4 py-2.5">
                <button type="button" className="md:hidden text-[#54656f]" onClick={() => setSelectedId(null)}>
                  ←
                </button>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00a884] text-sm font-semibold text-white">
                  {initials(contact)}
                </div>
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setShowInfo((v) => !v)}>
                  <p className="truncate text-[15px] font-medium text-[#111b21]">{contactLabel(contact)}</p>
                  <p className="truncate text-[12px] text-[#667781]">
                    Live · {contact?.phone_number}
                    {contact?.company_name ? ` · ${contact.company_name}` : ''}
                  </p>
                </button>
                <div className="flex items-center gap-2">
                  <span
                    className={`hidden rounded-full px-2 py-0.5 text-[11px] font-semibold sm:inline ${
                      selected.mode === 'AI'
                        ? 'bg-emerald-50 text-emerald-700'
                        : selected.mode === 'HYBRID'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {selected.mode}
                  </span>
                  <AdminButton size="sm" onClick={() => setShowInfo((v) => !v)}>
                    {showInfo ? 'Hide details' : 'Details'}
                  </AdminButton>
                </div>
              </header>

              {prospect && !showInfo && (
                <div className="flex flex-wrap items-center gap-2 border-b border-[#e9edef] bg-white px-4 py-2">
                  <AdminBadge variant={prospect.variant}>{prospect.label}</AdminBadge>
                  {snapshot.map((row) => (
                    <span key={row.label} className="rounded-full bg-[#f0f2f5] px-2 py-0.5 text-[11px] font-medium text-[#54656f]">
                      {row.value.replace(' — team should call', '')}
                    </span>
                  ))}
                </div>
              )}

              {showInfo && (
                <div className="max-h-[46%] overflow-y-auto border-b border-[#e9edef] bg-[#f0f2f5] px-3 py-3 md:px-4">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.9fr)]">
                    <div className="rounded-2xl border border-[#e9edef] bg-white p-4 shadow-sm">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-[#111b21]">Lead snapshot</h3>
                        {prospect && <AdminBadge variant={prospect.variant}>{prospect.label}</AdminBadge>}
                      </div>
                      {brief ? (
                        <p className="rounded-xl bg-[#f6f7f8] px-3 py-2.5 text-sm leading-6 text-[#111b21]">{brief}</p>
                      ) : (
                        <p className="text-sm text-[#667781]">Waiting for them to share what they need.</p>
                      )}
                      {snapshot.length > 0 && (
                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                          {snapshot.map((row) => (
                            <FactChip
                              key={row.label}
                              label={row.label}
                              value={row.value.replace(' — team should call', '')}
                              tone={row.label === 'Call' && /requested/i.test(row.value) ? 'green' : 'slate'}
                            />
                          ))}
                        </div>
                      )}
                      {steps.length > 0 && (
                        <ol className="mt-4 space-y-2 border-t border-[#f0f2f5] pt-3">
                          {steps.map((step, index) => (
                            <li key={step} className="flex gap-3 text-sm leading-5 text-[#111b21]">
                              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e9edef] text-[10px] font-semibold text-[#54656f]">
                                {index + 1}
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>

                    <div className="rounded-2xl border border-[#e9edef] bg-white p-4 shadow-sm">
                      <h3 className="mb-3 text-sm font-semibold text-[#111b21]">Manage</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#667781]">Lead</span>
                          <select
                            className={`${adminSelectClass} py-2 text-sm`}
                            value={detail?.conversation.lead_stage || selected.lead_stage}
                            onChange={(e) => updateStatus({ lead_stage: e.target.value })}
                          >
                            {LEAD_STAGES.map((stage) => (
                              <option key={stage.value} value={stage.value}>
                                {stage.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#667781]">Chat</span>
                          <select
                            className={`${adminSelectClass} py-2 text-sm`}
                            value={detail?.conversation.status || selected.status}
                            onChange={(e) => updateStatus({ status: e.target.value })}
                          >
                            {CONVERSATION_STATUSES.map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <p className="mb-1.5 mt-4 text-[10px] font-semibold uppercase tracking-wide text-[#667781]">Mode</p>
                      <div className="flex rounded-xl bg-[#f0f2f5] p-1">
                        {(
                          [
                            { id: 'AI', label: 'AI', run: () => action('enable-ai', 'AI enabled.') },
                            { id: 'HYBRID', label: 'Hybrid', run: () => action('hybrid', 'Hybrid mode enabled.') },
                            { id: 'HUMAN', label: 'Take over', run: () => action('takeover', 'Human takeover enabled.') },
                          ] as const
                        ).map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={item.run}
                            className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition ${
                              selected.mode === item.id
                                ? 'bg-white text-[#111b21] shadow-sm'
                                : 'text-[#667781] hover:text-[#111b21]'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                      {selected.handoff_required && (
                        <p className="mt-2 text-xs font-medium text-rose-700">Handoff needed — a person should reply.</p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {detail?.appointment?.id && (
                          <a href={`/admin/whatsapp/appointments/${detail.appointment.id}`}>
                            <AdminButton size="sm">
                              Appointment {detail.appointment.code}
                            </AdminButton>
                          </a>
                        )}
                        <AdminButton size="sm" variant="danger" onClick={() => action('close', 'Conversation closed.')}>
                          Close chat
                        </AdminButton>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div
                ref={threadRef}
                className="flex-1 space-y-1 overflow-y-auto px-4 py-3 md:px-10"
                onScroll={(e) => {
                  const el = e.currentTarget;
                  nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
                }}
              >
                {(detail?.messages || []).map((m) => {
                  const outgoing = isOutgoing(m.sender_type);
                  return (
                    <div key={m.id} className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-lg px-2.5 py-1.5 shadow-sm md:max-w-[65%] ${
                          outgoing ? 'bg-[#d9fdd3] rounded-tr-none' : 'bg-white rounded-tl-none'
                        }`}
                      >
                        {m.sender_type !== 'CUSTOMER' && (
                          <p className="text-[10px] font-semibold text-[#00a884]">
                            {m.message_type === 'followup' ? 'Follow-up' : m.sender_type === 'AI' ? 'Assistant' : 'Staff'}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap text-[14.2px] leading-5 text-[#111b21]">{m.text_content}</p>
                        <p className="mt-0.5 text-right text-[10px] text-[#667781]">{formatChatTime(m.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
                {detail && detail.messages.length === 0 && (
                  <p className="py-8 text-center text-sm text-[#667781]">No messages in this chat yet.</p>
                )}
              </div>

              <footer className="flex items-center gap-2 bg-[#f0f2f5] px-3 py-2.5">
                <input
                  className="h-11 flex-1 rounded-lg border-0 bg-white px-4 text-sm text-[#111b21] outline-none placeholder:text-[#667781]"
                  placeholder="Type a message"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                />
                <button
                  type="button"
                  disabled={sending || !draft.trim()}
                  onClick={sendMessage}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white disabled:opacity-50"
                  aria-label="Send"
                >
                  {sending ? '…' : '➤'}
                </button>
              </footer>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
