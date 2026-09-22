'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import { adminInputClass, adminTextareaClass } from '@/components/admin/AdminField';
import { ProviderShell, StatusPill } from '@/components/admin/wa-provider/ProviderUi';

export default function InboxPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState('');
  const [note, setNote] = useState('');

  const load = (conversationId?: string) => {
    fetch(`/api/admin/wa-provider/inbox${conversationId ? `?conversationId=${conversationId}` : ''}`)
      .then((r) => r.json())
      .then((body) => {
        setConversations(body.conversations || []);
        setMessages(body.messages || []);
      });
  };
  useEffect(() => load(), []);

  return (
    <ProviderShell>
      <AdminPageHeader title="Inbox" description="Multi-agent WhatsApp inbox. Internal notes are never sent to WhatsApp." />
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 min-h-[560px]">
        <AdminSection title="Conversations">
          <div className="space-y-1 max-h-[520px] overflow-y-auto">
            {conversations.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => {
                  setActive(row);
                  load(row.id);
                }}
                className={`w-full text-left rounded-lg border px-3 py-2 ${active?.id === row.id ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200'}`}
              >
                <p className="text-sm font-medium">{row.wa_contacts?.name || row.wa_contacts?.phone || 'Unknown'}</p>
                <p className="text-[11px] text-slate-500 truncate">{row.last_message_preview}</p>
              </button>
            ))}
          </div>
        </AdminSection>
        <div className="xl:col-span-6">
          <AdminSection title={active?.wa_contacts?.name || 'Conversation'}>
            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              {messages.map((message) => (
                <div key={message.id} className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${message.direction === 'INBOUND' ? 'bg-white border' : 'ml-auto bg-emerald-50 border border-emerald-100'}`}>
                  <p>{message.content_json?.text || message.type}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{message.status}</p>
                </div>
              ))}
            </div>
            <textarea className={adminTextareaClass} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to WhatsApp" />
            <AdminButton
              variant="primary"
              onClick={async () => {
                await fetch('/api/admin/wa-provider/inbox/reply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: active?.client_id, to: active?.wa_contacts?.phone, text: reply, phoneNumberId: active?.phone_number_id }) });
                setReply('');
                load(active?.id);
              }}
            >
              Send
            </AdminButton>
          </AdminSection>
        </div>
        <AdminSection title="Contact">
          <p className="text-sm">{active?.wa_contacts?.name || '—'}</p>
          <p className="text-xs text-slate-500">{active?.wa_contacts?.phone}</p>
          <StatusPill value={active?.status} />
          <textarea className={`${adminTextareaClass} mt-3`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Internal note" />
          <AdminButton
            onClick={async () => {
              await fetch('/api/admin/wa-provider/inbox/note', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: active?.id, clientId: active?.client_id, note }) });
              setNote('');
            }}
          >
            Save internal note
          </AdminButton>
        </AdminSection>
      </div>
    </ProviderShell>
  );
}
