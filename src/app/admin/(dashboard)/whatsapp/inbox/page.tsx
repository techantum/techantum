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

type Detail = {
  conversation: WhatsAppConversation;
  messages: WhatsAppMessage[];
  lead: Record<string, unknown> | null;
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
  return contact.first_name || contact.profile_name || contact.phone_number;
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
  const summary = (row.conversation_summary || '').split('\n').find((line) => line.trim());
  if (summary) return summary.replace(/^Contact:\s*/i, '');
  return row.lead_stage.replace(/_/g, ' ').toLowerCase();
}

function isOutgoing(sender: string) {
  return sender === 'AI' || sender === 'STAFF';
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

  const loadList = useCallback(() => {
    fetch(`/api/admin/whatsapp/conversations?search=${encodeURIComponent(search)}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Failed to load');
        setRows(body);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [search]);

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/whatsapp/conversations/${id}`);
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
    loadDetail(selectedId).catch((err) => setError(err instanceof Error ? err.message : 'Failed to load conversation'));
  }, [selectedId, loadDetail]);

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [detail?.messages.length, selectedId]);

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) || detail?.conversation || null,
    [rows, selectedId, detail]
  );
  const contact = (detail?.conversation.whatsapp_contacts || selected?.whatsapp_contacts) as WhatsAppContact | undefined;
  const summary =
    detail?.conversation.conversation_summary ||
    selected?.conversation_summary ||
    (detail?.lead?.ai_summary as string | undefined) ||
    '';

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
      await loadDetail(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <AdminPageHeader title="WhatsApp Inbox" description="Chats with customers. Select a conversation to reply." />
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
              <p className="text-[11px] text-[#667781]">{rows.length} conversation{rows.length === 1 ? '' : 's'}</p>
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
                    <p className="mt-0.5 truncate text-[13px] text-[#667781]">{previewText(row)}</p>
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
                    {contact?.phone_number}
                    {contact?.company_name ? ` · ${contact.company_name}` : ''}
                    {selected.mode ? ` · ${selected.mode}` : ''}
                  </p>
                </button>
                <div className="hidden items-center gap-1 sm:flex">
                  <AdminButton size="sm" onClick={() => action('takeover', 'Human takeover enabled.')}>
                    Take over
                  </AdminButton>
                  <AdminButton size="sm" onClick={() => action('enable-ai', 'AI enabled.')}>
                    Enable AI
                  </AdminButton>
                  <AdminButton size="sm" onClick={() => setShowInfo((v) => !v)}>
                    {showInfo ? 'Hide details' : 'Details'}
                  </AdminButton>
                </div>
              </header>

              {showInfo && (
                <div className="grid gap-3 border-b border-[#e9edef] bg-white p-4 md:grid-cols-2">
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#667781]">Summary</p>
                    <p className="whitespace-pre-wrap text-sm text-[#111b21]">
                      {summary || 'Summary will appear after the assistant replies.'}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#667781]">Lead status</span>
                      <select
                        className={`${adminSelectClass} mt-1`}
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
                    <label className="text-sm">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#667781]">Chat status</span>
                      <select
                        className={`${adminSelectClass} mt-1`}
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
                    <div className="sm:col-span-2 flex flex-wrap gap-1.5">
                      <AdminBadge variant={selected.mode === 'AI' ? 'green' : selected.mode === 'HYBRID' ? 'amber' : 'rose'}>
                        {selected.mode}
                      </AdminBadge>
                      {selected.handoff_required && <AdminBadge variant="rose">Handoff</AdminBadge>}
                      <AdminButton size="sm" onClick={() => action('hybrid', 'Hybrid mode enabled.')}>
                        Hybrid
                      </AdminButton>
                      <AdminButton size="sm" onClick={() => action('close', 'Conversation closed.')}>
                        Close
                      </AdminButton>
                    </div>
                  </div>
                </div>
              )}

              <div ref={threadRef} className="flex-1 space-y-1 overflow-y-auto px-4 py-3 md:px-10">
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
                          <p className="text-[10px] font-semibold text-[#00a884]">{m.sender_type === 'AI' ? 'Assistant' : 'Staff'}</p>
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
