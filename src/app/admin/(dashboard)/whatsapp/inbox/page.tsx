'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminButton from '@/components/admin/AdminButton';
import AdminBadge from '@/components/admin/AdminBadge';
import AdminAlert from '@/components/admin/AdminAlert';
import { adminInputClass } from '@/components/admin/AdminField';
import { OpsPageShell, formatOpsWhen } from '@/components/admin/ops/OpsUi';
import type { WhatsAppContact, WhatsAppConversation, WhatsAppMessage } from '@/lib/whatsapp/types';

type Detail = {
  conversation: WhatsAppConversation;
  messages: WhatsAppMessage[];
  lead: Record<string, unknown> | null;
};

function contactLabel(contact?: WhatsAppContact | null) {
  if (!contact) return 'Unknown';
  return contact.first_name || contact.profile_name || contact.phone_number;
}

function modeVariant(mode: string): 'green' | 'amber' | 'rose' | 'indigo' {
  if (mode === 'AI') return 'green';
  if (mode === 'HYBRID') return 'amber';
  return 'rose';
}

function senderStyle(sender: string) {
  if (sender === 'CUSTOMER') return 'bg-white border-border ml-0 mr-8';
  if (sender === 'AI') return 'bg-indigo-50 border-indigo-100 ml-8 mr-0';
  if (sender === 'STAFF') return 'bg-emerald-50 border-emerald-100 ml-8 mr-0';
  return 'bg-muted/40 border-border mx-4 text-center text-xs';
}

export default function WhatsAppInboxPage() {
  const [rows, setRows] = useState<WhatsAppConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

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

  const loadDetail = useCallback((id: string) => {
    fetch(`/api/admin/whatsapp/conversations/${id}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Failed to load conversation');
        setDetail(body);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load conversation'));
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) || detail?.conversation || null, [rows, selectedId, detail]);

  const action = async (path: string, success: string) => {
    if (!selectedId) return;
    setError('');
    const res = await fetch(`/api/admin/whatsapp/conversations/${selectedId}/${path}`, { method: 'POST' });
    const body = await res.json();
    if (!res.ok) return setError(body.error || 'Action failed');
    setMessage(success);
    loadList();
    loadDetail(selectedId);
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
      loadDetail(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const contact = (selected?.whatsapp_contacts || detail?.conversation.whatsapp_contacts) as WhatsAppContact | undefined;

  return (
    <OpsPageShell>
      <AdminPageHeader title="WhatsApp Inbox" description="AI and staff conversations with customers." />

      {message && <AdminAlert>{message}</AdminAlert>}
      {error && <AdminAlert variant="error">{error}</AdminAlert>}

      <div className="flex gap-2 mb-2">
        <input
          className={`${adminInputClass} max-w-sm`}
          placeholder="Search name, phone, company…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadList()}
        />
        <AdminButton onClick={loadList}>Search</AdminButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 min-h-[70vh]">
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <div className="px-3 py-2 border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Conversations
          </div>
          <div className="max-h-[70vh] overflow-y-auto divide-y divide-border/60">
            {loading && <p className="p-3 text-sm text-muted-foreground">Loading…</p>}
            {!loading && rows.length === 0 && <p className="p-3 text-sm text-muted-foreground">No conversations yet.</p>}
            {rows.map((row) => {
              const c = row.whatsapp_contacts as WhatsAppContact | undefined;
              const active = row.id === selectedId;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  className={`w-full text-left p-3 hover:bg-muted/30 ${active ? 'bg-indigo-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold truncate">{contactLabel(c)}</p>
                    <AdminBadge variant={modeVariant(row.mode)}>{row.mode}</AdminBadge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{c?.company_name || c?.phone_number}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {row.last_inbound_at ? formatOpsWhen(row.last_inbound_at) : '—'} · {row.lead_stage}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card flex flex-col min-h-[70vh]">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Select a conversation</div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-foreground">{contactLabel(contact)}</h2>
                  <p className="text-xs text-muted-foreground">{contact?.phone_number} · {contact?.company_name || 'No company yet'}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <AdminBadge variant={modeVariant(selected.mode)}>{selected.mode}</AdminBadge>
                    <AdminBadge>{selected.lead_stage}</AdminBadge>
                    {selected.handoff_required && <AdminBadge variant="rose">Handoff</AdminBadge>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <AdminButton size="sm" onClick={() => action('takeover', 'Human takeover enabled.')}>Take over</AdminButton>
                  <AdminButton size="sm" onClick={() => action('enable-ai', 'AI enabled.')}>Enable AI</AdminButton>
                  <AdminButton size="sm" onClick={() => action('hybrid', 'Hybrid mode enabled.')}>Hybrid</AdminButton>
                  <AdminButton size="sm" onClick={() => action('close', 'Conversation closed.')}>Close</AdminButton>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1fr_240px] flex-1 min-h-0">
                <div className="flex flex-col min-h-0 border-r border-border/60">
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {(detail?.messages || []).map((m) => (
                      <div key={m.id} className={`rounded-lg border px-3 py-2 text-sm ${senderStyle(m.sender_type)}`}>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                          {m.sender_type} · {formatOpsWhen(m.created_at)}
                        </p>
                        <p className="whitespace-pre-wrap">{m.text_content}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-border flex gap-2">
                    <input
                      className={adminInputClass}
                      placeholder="Type a reply…"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                    />
                    <AdminButton variant="primary" disabled={sending || !draft.trim()} onClick={sendMessage}>
                      {sending ? 'Sending…' : 'Send'}
                    </AdminButton>
                  </div>
                </div>

                <aside className="p-3 space-y-3 text-sm overflow-y-auto">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Contact</p>
                    <p>{contact?.email || '—'}</p>
                    <p>{contact?.location || '—'}</p>
                  </div>
                  {detail?.lead && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Lead</p>
                      <p className="font-mono text-xs">{String(detail.lead.lead_code || '')}</p>
                      <p>{String(detail.lead.service || '—')}</p>
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{String(detail.lead.ai_summary || detail.conversation.conversation_summary || '—')}</p>
                    </div>
                  )}
                  {!detail?.lead && selected.conversation_summary && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">AI summary</p>
                      <p className="text-xs whitespace-pre-wrap">{selected.conversation_summary}</p>
                    </div>
                  )}
                </aside>
              </div>
            </>
          )}
        </div>
      </div>
    </OpsPageShell>
  );
}
