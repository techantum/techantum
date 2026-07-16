'use client';

import { useEffect, useState } from 'react';

export interface ClarificationMessage {
  id: string;
  author_type: 'admin' | 'partner';
  author_name: string;
  message: string;
  created_at: string;
}

interface ClarificationThreadProps {
  requirementId: string;
  apiBase: '/api/partner/requirements' | '/api/admin/partner-requirements';
  canReply?: boolean;
  replyLabel?: string;
}

export default function ClarificationThread({
  requirementId,
  apiBase,
  canReply = false,
  replyLabel = 'Send Reply',
}: ClarificationThreadProps) {
  const [messages, setMessages] = useState<ClarificationMessage[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    fetch(`${apiBase}/${requirementId}/clarifications`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMessages(data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [requirementId]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    setError('');
    const res = await fetch(`${apiBase}/${requirementId}/clarifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: reply.trim() }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      setError(data.error || 'Failed to send');
      return;
    }
    setMessages(data);
    setReply('');
  };

  if (loading) return <p className="text-sm text-slate-500">Loading clarifications…</p>;

  return (
    <div className="space-y-4">
      {messages.length === 0 ? (
        <p className="text-sm text-slate-500">No clarification messages yet.</p>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-lg p-3 text-sm ${
                msg.author_type === 'admin'
                  ? 'bg-amber-50 border border-amber-200 ml-0 mr-8'
                  : 'bg-indigo-50 border border-indigo-200 ml-8 mr-0'
              }`}
            >
              <p className="text-xs font-medium mb-1">
                {msg.author_name}
                <span className="text-slate-400 font-normal ml-2">
                  {new Date(msg.created_at).toLocaleString('en-IN')}
                </span>
              </p>
              <p className="whitespace-pre-wrap text-slate-800">{msg.message}</p>
            </div>
          ))}
        </div>
      )}

      {canReply && (
        <form onSubmit={send} className="space-y-2">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
            placeholder="Type your reply…"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={sending || !reply.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white disabled:opacity-50"
          >
            {sending ? 'Sending…' : replyLabel}
          </button>
        </form>
      )}
    </div>
  );
}
