'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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
  placeholder?: string;
  refreshKey?: number;
  pollIntervalMs?: number;
  compact?: boolean;
  chatMode?: 'clarification' | 'chat';
}

function formatDayLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function ClarificationThread({
  requirementId,
  apiBase,
  canReply = false,
  replyLabel = 'Send Reply',
  placeholder = 'Type your message…',
  refreshKey = 0,
  pollIntervalMs = 15000,
  compact = false,
  chatMode = 'chat',
}: ClarificationThreadProps) {
  const [messages, setMessages] = useState<ClarificationMessage[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/${requirementId}/clarifications`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load messages');
        return;
      }
      if (Array.isArray(data)) {
        setMessages(data);
        requestAnimationFrame(scrollToBottom);
      } else {
        setError('Unexpected response from server');
      }
    } catch {
      setError('Could not load messages. Check your connection.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [apiBase, requirementId, scrollToBottom]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    if (!pollIntervalMs) return;
    const timer = setInterval(() => load(true), pollIntervalMs);
    return () => clearInterval(timer);
  }, [load, pollIntervalMs]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/${requirementId}/clarifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply.trim(), mode: chatMode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to send');
        return;
      }
      if (Array.isArray(data)) {
        setMessages(data);
        setReply('');
        requestAnimationFrame(scrollToBottom);
      } else {
        setError('Unexpected response after sending');
      }
    } catch {
      setError('Could not send message. Try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading conversation…</p>;
  }

  const grouped: { day: string; items: ClarificationMessage[] }[] = [];
  for (const msg of messages) {
    const day = formatDayLabel(new Date(msg.created_at));
    const last = grouped[grouped.length - 1];
    if (last?.day === day) last.items.push(msg);
    else grouped.push({ day, items: [msg] });
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center justify-between gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <span>{error}</span>
          <button type="button" onClick={() => load()} className="text-xs font-medium underline shrink-0">
            Retry
          </button>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
          <p className="text-sm font-medium text-slate-700">No messages yet</p>
          <p className="text-xs text-slate-500 mt-1">
            Start the conversation to clarify requirements and keep the discussion in one place.
          </p>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className={`space-y-4 overflow-y-auto pr-1 ${compact ? 'max-h-72' : 'max-h-[28rem]'}`}
        >
          {grouped.map((group) => (
            <div key={group.day}>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {group.day}
                </span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              <div className="space-y-3">
                {group.items.map((msg) => {
                  const isAdmin = msg.author_type === 'admin';
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${isAdmin ? 'justify-start' : 'justify-end'}`}
                    >
                      {isAdmin && (
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0">
                          TA
                        </div>
                      )}
                      <div className={`max-w-[85%] ${isAdmin ? '' : 'order-first'}`}>
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                            isAdmin
                              ? 'bg-white border border-amber-200 rounded-tl-sm'
                              : 'bg-indigo-600 text-white rounded-tr-sm'
                          }`}
                        >
                          <p className={`whitespace-pre-wrap leading-relaxed ${isAdmin ? 'text-slate-800' : ''}`}>
                            {msg.message}
                          </p>
                        </div>
                        <p className={`text-[10px] mt-1 px-1 ${isAdmin ? 'text-slate-400' : 'text-slate-400 text-right'}`}>
                          <span className="font-medium">{msg.author_name}</span>
                          <span className="mx-1">·</span>
                          {formatTime(new Date(msg.created_at))}
                        </p>
                      </div>
                      {!isAdmin && (
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {msg.author_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {canReply && (
        <form onSubmit={send} className="space-y-2 border-t border-slate-100 pt-4">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={compact ? 2 : 3}
            placeholder={placeholder}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-400">Messages are saved in this requirement thread</p>
            <button
              type="submit"
              disabled={sending || !reply.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {sending ? 'Sending…' : replyLabel}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
