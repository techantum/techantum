'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import AdminAlert from '@/components/admin/AdminAlert';
import { adminSelectClass, adminTextareaClass } from '@/components/admin/AdminField';
import type {
  ConversationStatus,
  WhatsAppContact,
  WhatsAppConversation,
  WhatsAppConversationNote,
  WhatsAppMessage,
} from '@/lib/whatsapp/types';
import { normalizeQualification, serviceLabel } from '@/lib/whatsapp/qualification';
import { LEAD_PIPELINE } from '@/lib/whatsapp/pipeline';

type InboxTab = 'all' | 'unread' | 'open' | 'resolved';

type Detail = {
  conversation: WhatsAppConversation;
  messages: WhatsAppMessage[];
  lead: Record<string, unknown> | null;
  appointment?: { id: string; code: string; status: string; requested_slot_text?: string | null; scheduled_at?: string | null } | null;
  notes?: WhatsAppConversationNote[];
};

const LEAD_STAGES = LEAD_PIPELINE.map((item) => ({ value: item.id, label: item.label }));

const CONVERSATION_STATUSES: { value: ConversationStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Resolved' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const QUICK_TEMPLATES = [
  'Hello! Thanks for contacting Techantum. How can I help you today?',
  'Could you please share what type of solution you are looking for — website, web application, or mobile application?',
  'A brief overview of the requirement, key features, target users, and timeline will help us assist you better.',
  'I can connect you with our solution expert for a short call. What time works for you?',
];

const AVATAR_TONES = [
  'bg-violet-500',
  'bg-sky-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-fuchsia-500',
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

function avatarTone(seed?: string) {
  const value = seed || '?';
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash + value.charCodeAt(i) * (i + 1)) % AVATAR_TONES.length;
  return AVATAR_TONES[hash];
}

function formatChatTime(iso?: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatExactTime(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function dateBucket(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isOutgoing(sender: string) {
  return sender === 'AI' || sender === 'STAFF';
}

function isUnread(row: WhatsAppConversation) {
  return (row.unread_count || 0) > 0;
}

function isResolved(row: WhatsAppConversation) {
  return row.status === 'CLOSED' || row.status === 'ARCHIVED';
}

function leadTag(stage?: string) {
  return LEAD_STAGES.find((item) => item.value === stage)?.label || stage || 'New Lead';
}

function conversationTags(row?: WhatsAppConversation | null) {
  if (!row) return [];
  const q = normalizeQualification(row.qualification);
  const tags: { label: string; tone: string }[] = [{ label: leadTag(row.lead_stage), tone: 'emerald' }];
  if (q.service) tags.push({ label: serviceLabel(q.service), tone: 'sky' });
  if (q.purpose === 'existing') tags.push({ label: 'Existing Customer', tone: 'slate' });
  if (row.intent && /support/i.test(row.intent)) tags.push({ label: 'Support', tone: 'amber' });
  return tags.slice(0, 3);
}

function tagClass(tone: string) {
  if (tone === 'emerald') return 'bg-emerald-50 text-emerald-700';
  if (tone === 'sky') return 'bg-sky-50 text-sky-700';
  if (tone === 'amber') return 'bg-amber-50 text-amber-800';
  if (tone === 'violet') return 'bg-violet-50 text-violet-700';
  return 'bg-slate-100 text-slate-600';
}

function phoneDigits(phone?: string | null) {
  return (phone || '').replace(/\D/g, '');
}

function sourceLabel(row?: WhatsAppConversation | null) {
  const q = normalizeQualification(row?.qualification);
  if (q.service === 'WEBSITE') return 'Website';
  if (q.service === 'WEB_APPLICATION') return 'Web application';
  if (q.service === 'MOBILE_APPLICATION') return 'Mobile application';
  return 'WhatsApp';
}

function WhatsAppInboxPageInner() {
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<WhatsAppConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams?.get('id') || null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<InboxTab>('all');
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [me, setMe] = useState<{ userId?: string; email?: string } | null>(null);
  const [mobilePane, setMobilePane] = useState<'list' | 'chat' | 'details'>('list');
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
    const fromQuery = searchParams?.get('id');
    if (fromQuery) {
      setSelectedId(fromQuery);
      setMobilePane('chat');
    }
  }, [searchParams]);

  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => r.json())
      .then((body) => setMe({ userId: body.userId, email: body.email }))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setDraft('');
    setShowNote(false);
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
    [rows, selectedId, detail],
  );
  const contact = (detail?.conversation.whatsapp_contacts || selected?.whatsapp_contacts) as WhatsAppContact | undefined;
  const tags = conversationTags(selected);
  const counts = useMemo(
    () => ({
      all: rows.length,
      unread: rows.filter(isUnread).length,
      open: rows.filter((row) => row.status === 'OPEN').length,
      resolved: rows.filter(isResolved).length,
    }),
    [rows],
  );
  const visibleRows = useMemo(() => {
    if (tab === 'unread') return rows.filter(isUnread);
    if (tab === 'open') return rows.filter((row) => row.status === 'OPEN');
    if (tab === 'resolved') return rows.filter(isResolved);
    return rows;
  }, [rows, tab]);

  const groupedMessages = useMemo(() => {
    const groups: { label: string; items: WhatsAppMessage[] }[] = [];
    for (const item of detail?.messages || []) {
      const label = dateBucket(item.created_at);
      const last = groups[groups.length - 1];
      if (!last || last.label !== label) groups.push({ label, items: [item] });
      else last.items.push(item);
    }
    return groups;
  }, [detail?.messages]);

  const activity = useMemo(() => {
    const items = [
      ...(detail?.notes || []).map((row) => ({
        id: `note-${row.id}`,
        title: 'Internal note added',
        body: row.body,
        at: row.created_at,
      })),
      ...(detail?.messages || []).slice(-6).reverse().map((row) => ({
        id: row.id,
        title:
          row.sender_type === 'CUSTOMER'
            ? 'Customer sent a message'
            : row.sender_type === 'AI'
              ? 'Replied by AI'
              : 'Staff replied',
        body: row.text_content || '',
        at: row.created_at,
      })),
    ]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 6);
    return items;
  }, [detail]);

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

  const updateStatus = async (patch: { lead_stage?: string; status?: string; assigned_user_id?: string | null }) => {
    if (!selectedId) return;
    setError('');
    const res = await fetch(`/api/admin/whatsapp/conversations/${selectedId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const body = await res.json();
    if (!res.ok) return setError(body.error || 'Status update failed');
    setMessage('Updated.');
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
      loadList(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const saveNote = async () => {
    if (!selectedId || !note.trim()) return;
    setSavingNote(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/whatsapp/conversations/${selectedId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: note }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to save note');
      setDetail(body);
      setNote('');
      setShowNote(false);
      setMessage('Note saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setSavingNote(false);
    }
  };

  const copyPhone = async () => {
    if (!contact?.phone_number) return;
    await navigator.clipboard.writeText(contact.phone_number);
    setMessage('Phone number copied.');
  };

  const selectConversation = (id: string) => {
    setSelectedId(id);
    setMobilePane('chat');
  };

  const headerStats: { id: InboxTab; label: string; value: number; icon: string; tone: string }[] = [
    { id: 'all', label: 'All', value: counts.all, icon: 'ChatBubbleLeftRightIcon', tone: 'text-slate-700' },
    { id: 'unread', label: 'Unread', value: counts.unread, icon: 'EnvelopeIcon', tone: 'text-violet-600' },
    { id: 'open', label: 'Open', value: counts.open, icon: 'ClockIcon', tone: 'text-amber-600' },
    { id: 'resolved', label: 'Resolved', value: counts.resolved, icon: 'CheckCircleIcon', tone: 'text-emerald-600' },
  ];

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-md shadow-emerald-500/20">
            <Icon name="ChatBubbleLeftRightIcon" size={22} />
          </div>
          <div>
            <h1 className="font-bricolage text-2xl font-bold text-slate-900">WhatsApp Inbox</h1>
            <p className="text-sm text-slate-500">Manage customer conversations, automate with AI and convert leads.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerStats.map((stat) => (
            <button
              key={stat.id}
              type="button"
              onClick={() => setTab(stat.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${
                tab === stat.id ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              <Icon name={stat.icon} size={15} className={stat.tone} />
              {stat.label}
              <span className="text-slate-900">{stat.value}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowTemplates((open) => !open)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Icon name="DocumentDuplicateIcon" size={16} />
            Templates
          </button>
          <button
            type="button"
            onClick={() => setShowNewChat(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
          >
            <Icon name="PlusIcon" size={16} />
            New Chat
          </button>
        </div>
      </div>

      {message && <AdminAlert>{message}</AdminAlert>}
      {error && <AdminAlert variant="error">{error}</AdminAlert>}

      <div className="flex h-[calc(100vh-12.5rem)] min-h-[620px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <aside className={`${selectedId && mobilePane !== 'list' ? 'hidden xl:flex' : 'flex'} w-full xl:w-[340px] shrink-0 flex-col border-r border-slate-100`}>
          <div className="flex gap-1 border-b border-slate-100 px-3 py-2">
            {headerStats.map((stat) => (
              <button
                key={stat.id}
                type="button"
                onClick={() => setTab(stat.id)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold ${
                  tab === stat.id ? 'bg-violet-50 text-violet-700' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {stat.label}
                <span className="ml-1">{stat.value}</span>
              </button>
            ))}
          </div>
          <div className="px-3 py-3">
            <div className="relative">
              <Icon name="MagnifyingGlassIcon" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-violet-300 focus:bg-white"
                placeholder="Search name, phone or message…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadList()}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && <p className="px-4 py-6 text-sm text-slate-500">Loading chats…</p>}
            {!loading && visibleRows.length === 0 && <p className="px-4 py-6 text-sm text-slate-500">No conversations in this view.</p>}
            {visibleRows.map((row) => {
              const c = row.whatsapp_contacts as WhatsAppContact | undefined;
              const active = row.id === selectedId;
              const rowTags = conversationTags(row);
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => selectConversation(row.id)}
                  className={`flex w-full gap-3 border-b border-slate-50 px-3 py-3 text-left hover:bg-slate-50 ${
                    active ? 'bg-violet-50/70' : 'bg-white'
                  }`}
                >
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarTone(contactLabel(c))}`}>
                    {initials(c)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{contactLabel(c)}</p>
                      <span className="shrink-0 text-[11px] text-slate-400">{formatChatTime(row.last_message_at || row.last_inbound_at)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <p className="truncate text-[13px] text-slate-500">{row.last_message_preview || 'No messages yet'}</p>
                      {isUnread(row) && (
                        <span className="ml-auto inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
                          {row.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {rowTags.map((item) => (
                        <span key={item.label} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tagClass(item.tone)}`}>
                          {item.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className={`${!selectedId || mobilePane === 'list' ? 'hidden xl:flex' : mobilePane === 'details' ? 'hidden xl:flex' : 'flex'} min-w-0 flex-1 flex-col bg-[#f7f8fa]`}>
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] text-white">
                <Icon name="ChatBubbleLeftRightIcon" size={28} />
              </div>
              <p className="text-lg font-semibold text-slate-800">Select a conversation</p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">Choose a chat from the left to reply, assign, and convert the lead.</p>
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
                <button type="button" className="xl:hidden text-slate-500" onClick={() => setMobilePane('list')}>
                  <Icon name="ArrowLeftIcon" size={18} />
                </button>
                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white ${avatarTone(contactLabel(contact))}`}>
                  {initials(contact)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{contactLabel(contact)}</p>
                  <button type="button" onClick={copyPhone} className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-violet-600">
                    {contact?.phone_number || 'No phone'}
                    <Icon name="ClipboardDocumentIcon" size={13} />
                  </button>
                </div>
                <div className="hidden flex-wrap gap-1 lg:flex">
                  {tags.map((item) => (
                    <span key={item.label} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tagClass(item.tone)}`}>
                      {item.label}
                    </span>
                  ))}
                </div>
                <select
                  className={`${adminSelectClass} max-w-[140px] py-1.5 text-xs`}
                  value={selected.assigned_user_id || ''}
                  onChange={(e) => updateStatus({ assigned_user_id: e.target.value || null })}
                >
                  <option value="">Assign</option>
                  {me?.userId && <option value={me.userId}>{me.email || 'Me'}</option>}
                  {selected.assigned_user_id && selected.assigned_user_id !== me?.userId && (
                    <option value={selected.assigned_user_id}>Assigned</option>
                  )}
                </select>
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 xl:hidden"
                  onClick={() => setMobilePane('details')}
                >
                  Details
                </button>
              </header>

              <div
                ref={threadRef}
                className="flex-1 space-y-3 overflow-y-auto px-4 py-4 md:px-8"
                onScroll={(e) => {
                  const el = e.currentTarget;
                  nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
                }}
              >
                {groupedMessages.map((group) => (
                  <div key={group.label} className="space-y-2">
                    <div className="flex justify-center">
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-400 shadow-sm">
                        {group.label}
                      </span>
                    </div>
                    {group.items.map((m) => {
                      const outgoing = isOutgoing(m.sender_type);
                      return (
                        <div key={m.id} className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-sm md:max-w-[70%] ${
                              outgoing ? 'rounded-tr-md bg-[#d9fdd3]' : 'rounded-tl-md bg-white'
                            }`}
                          >
                            {m.sender_type !== 'CUSTOMER' && (
                              <p className="mb-0.5 text-[10px] font-semibold text-emerald-700">
                                {m.message_type === 'followup' ? 'Follow-up' : m.sender_type === 'AI' ? 'AI Assistant' : 'Staff'}
                              </p>
                            )}
                            <p className="whitespace-pre-wrap text-[14px] leading-5 text-slate-800">{m.text_content}</p>
                            <p className="mt-1 text-right text-[10px] text-slate-400">{formatExactTime(m.created_at)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                {detail && detail.messages.length === 0 && (
                  <p className="py-10 text-center text-sm text-slate-500">No messages in this chat yet.</p>
                )}
              </div>

              <footer className="border-t border-slate-200 bg-white px-4 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500">
                    {selected.mode === 'AI' ? 'AI Assist is answering' : 'Reply / AI Assist'}
                  </p>
                  <div className="flex rounded-lg bg-slate-100 p-0.5">
                    {(
                      [
                        { id: 'AI', label: 'AI', run: () => action('enable-ai', 'AI enabled.') },
                        { id: 'HYBRID', label: 'Hybrid', run: () => action('hybrid', 'Hybrid mode enabled.') },
                        { id: 'HUMAN', label: 'Human', run: () => action('takeover', 'Human takeover enabled.') },
                      ] as const
                    ).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={item.run}
                        className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                          selected.mode === item.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <input
                    className="h-11 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none placeholder:text-slate-400 focus:border-violet-300 focus:bg-white"
                    placeholder="Type a message…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                  />
                  <button
                    type="button"
                    onClick={() => setShowTemplates((open) => !open)}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                    aria-label="Insert template"
                  >
                    <Icon name="DocumentTextIcon" size={18} />
                  </button>
                  <button
                    type="button"
                    disabled={sending || !draft.trim()}
                    onClick={sendMessage}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-600 text-white disabled:opacity-50"
                    aria-label="Send"
                  >
                    <Icon name="PaperAirplaneIcon" size={18} />
                  </button>
                </div>
                {showTemplates && (
                  <div className="mt-2 space-y-1 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                    {QUICK_TEMPLATES.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setDraft(item);
                          setShowTemplates(false);
                        }}
                        className="block w-full rounded-lg px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </footer>
            </>
          )}
        </section>

        <aside className={`${mobilePane === 'details' ? 'flex' : 'hidden'} xl:flex w-full xl:w-[320px] shrink-0 flex-col border-l border-slate-100 bg-white`}>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Contact Details</h2>
            <button type="button" className="xl:hidden text-slate-400" onClick={() => setMobilePane('chat')}>
              <Icon name="XMarkIcon" size={16} />
            </button>
          </div>
          {selected ? (
            <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
              <div className="text-center">
                <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold text-white ${avatarTone(contactLabel(contact))}`}>
                  {initials(contact)}
                </div>
                <p className="mt-3 font-semibold text-slate-900">{contactLabel(contact)}</p>
                <p className="text-sm text-slate-500">{contact?.phone_number || '—'}</p>
                <div className="mt-3 flex justify-center gap-2">
                  <a
                    href={contact?.phone_number ? `tel:${contact.phone_number}` : undefined}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <Icon name="PhoneIcon" size={13} /> Call
                  </a>
                  <a
                    href={phoneDigits(contact?.phone_number) ? `https://wa.me/${phoneDigits(contact?.phone_number)}` : undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700"
                  >
                    <Icon name="ChatBubbleLeftRightIcon" size={13} /> WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowNote((open) => !open)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <Icon name="PencilSquareIcon" size={13} /> Add Note
                  </button>
                </div>
              </div>

              {showNote && (
                <div className="space-y-2">
                  <textarea className={adminTextareaClass} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Internal note — not sent to WhatsApp" />
                  <button
                    type="button"
                    disabled={savingNote || !note.trim()}
                    onClick={saveNote}
                    className="w-full rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {savingNote ? 'Saving…' : 'Save note'}
                  </button>
                </div>
              )}

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Email</p>
                  <p className="mt-1 font-medium text-slate-800">{contact?.email || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Company</p>
                  <p className="mt-1 font-medium text-slate-800">{contact?.company_name || '—'}</p>
                </div>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</span>
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
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Chat status</span>
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
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Source</p>
                  <p className="mt-1 font-medium text-slate-800">{sourceLabel(selected)}</p>
                </div>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Assigned To</span>
                  <select
                    className={`${adminSelectClass} py-2 text-sm`}
                    value={selected.assigned_user_id || ''}
                    onChange={(e) => updateStatus({ assigned_user_id: e.target.value || null })}
                  >
                    <option value="">Unassigned</option>
                    {me?.userId && <option value={me.userId}>{me.email || 'Me'}</option>}
                  </select>
                </label>
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((item) => (
                      <span key={item.label} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tagClass(item.tone)}`}>
                        {item.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {detail?.appointment?.id && (
                <a href={`/admin/whatsapp/appointments/${detail.appointment.id}`} className="block rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700">
                  Appointment {detail.appointment.code}
                </a>
              )}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Recent Activity</p>
                </div>
                <ul className="space-y-3">
                  {activity.length === 0 && <li className="text-sm text-slate-500">No activity yet.</li>}
                  {activity.map((item) => (
                    <li key={item.id} className="flex gap-2">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{item.title}</p>
                        {item.body && <p className="line-clamp-2 text-xs text-slate-500">{item.body}</p>}
                        <p className="mt-0.5 text-[11px] text-slate-400">{formatChatTime(item.at)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="px-4 py-8 text-sm text-slate-500">Select a conversation to see contact details.</p>
          )}
        </aside>
      </div>

      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">New Chat</h2>
              <button type="button" onClick={() => setShowNewChat(false)} className="text-slate-400">
                <Icon name="XMarkIcon" size={18} />
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-500">Open WhatsApp with a customer number. The chat appears here after they reply or you already have a thread.</p>
            <input
              className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-300"
              placeholder="Phone with country code, e.g. 919876543210"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowNewChat(false)} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600">
                Cancel
              </button>
              <a
                href={phoneDigits(newPhone) ? `https://wa.me/${phoneDigits(newPhone)}` : undefined}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-semibold text-white"
              >
                Open WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WhatsAppInboxPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-slate-500">Loading inbox…</p>}>
      <WhatsAppInboxPageInner />
    </Suspense>
  );
}
