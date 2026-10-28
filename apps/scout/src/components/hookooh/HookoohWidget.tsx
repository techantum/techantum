'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import HookoohAvatar from './HookoohAvatar';
import Icon from '@/components/ui/AppIcon';

type Msg = { id?: string; role: 'user' | 'assistant'; content: string };
type Chat = { id: string; title: string };

const WELCOME =
  "Hey! I'm Hookooh, your YouTube growth assistant. Whether you're planning a new video, improving your thumbnails, understanding your analytics, or growing your channel, I'm here to help!";

async function api(path: string, init?: RequestInit) {
  const response = await fetch(`/api/hookooh/${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Hookooh request failed');
  return body;
}

function inlineText(text: string, key: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${key}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    return <span key={`${key}-${index}`}>{part}</span>;
  });
}

function formatReply(text: string) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let list: { kind: 'ul' | 'ol'; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.kind === 'ol' ? 'ol' : 'ul';
    const cls = list.kind === 'ol' ? 'list-decimal' : 'list-disc';
    blocks.push(
      <Tag key={`l-${blocks.length}`} className={`${cls} my-2 space-y-1 pl-5`}>
        {list.items.map((item, index) => <li key={index}>{inlineText(item, `i${blocks.length}-${index}`)}</li>)}
      </Tag>,
    );
    list = null;
  };
  lines.forEach((line, index) => {
    const numbered = line.match(/^\s*\d+\.\s+(.*)$/);
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (numbered) {
      if (list?.kind !== 'ol') flush();
      list = { kind: 'ol', items: [...(list?.items || []), numbered[1]] };
      return;
    }
    if (bullet) {
      if (list?.kind !== 'ul') flush();
      list = { kind: 'ul', items: [...(list?.items || []), bullet[1]] };
      return;
    }
    flush();
    if (!line.trim()) return;
    blocks.push(<p key={`p-${index}`} className="my-2 first:mt-0 last:mb-0">{inlineText(line, `p${index}`)}</p>);
  });
  flush();
  return blocks;
}

export default function HookoohWidget() {
  const [open, setOpen] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [error, setError] = useState('');
  const scroller = useRef<HTMLDivElement>(null);

  const loadSession = useCallback(async () => {
    const session = await api('session');
    setAllowed(Boolean(session.allowed && session.enabled));
    setEnabled(session.enabled !== false);
    setSuggestions(session.suggestions || []);
  }, []);

  useEffect(() => {
    loadSession().catch(() => setAllowed(false));
  }, [loadSession]);

  useEffect(() => {
    if (!open || !allowed) return;
    api('conversations')
      .then((body) => {
        setChats(body.rows || []);
        const stored = sessionStorage.getItem('hookooh_chat') || '';
        if (stored) setActiveId(stored);
      })
      .catch((err) => setError(err.message));
  }, [open, allowed]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    sessionStorage.setItem('hookooh_chat', activeId);
    api(`conversations/${activeId}`)
      .then((body) => setMessages(body.messages || []))
      .catch(() => setMessages([]));
  }, [activeId]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy, open]);

  const send = async (text?: string) => {
    const content = (text || draft).trim();
    if (!content || busy) return;
    setDraft('');
    setError('');
    setBusy(true);
    setMessages((current) => [...current, { role: 'user', content }]);
    try {
      let chatId = activeId;
      if (!chatId) {
        const created = await api('conversations', { method: 'POST', body: '{}' });
        chatId = created.id;
        setActiveId(chatId);
        setChats((current) => [{ id: created.id, title: content.slice(0, 48) }, ...current]);
      }
      const reply = await api(`conversations/${chatId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      setMessages((current) => [...current, reply.message]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach Hookooh');
    } finally {
      setBusy(false);
    }
  };

  const regenerate = async () => {
    if (!activeId || busy) return;
    setBusy(true);
    try {
      const reply = await api(`conversations/${activeId}/regenerate`, {
        method: 'POST',
        body: '{}',
      });
      setMessages((current) => {
        const next = [...current];
        const index = [...next].reverse().findIndex((item) => item.role === 'assistant');
        if (index >= 0) next.splice(next.length - 1 - index, 1);
        return [...next, reply.message];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not regenerate');
    } finally {
      setBusy(false);
    }
  };

  if (!allowed || !enabled) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Ask Hookooh"
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-5 right-5 z-[80] rounded-full bg-violet-700 p-1.5 shadow-xl ring-4 ring-violet-100 transition hover:bg-violet-800 lg:bottom-6 lg:right-6"
      >
        <HookoohAvatar size={52} pulse={!open} />
      </button>

      {open ? (
        <section className="fixed inset-x-0 bottom-0 z-[80] flex h-[min(100dvh,100%)] flex-col bg-white shadow-2xl sm:inset-x-auto sm:bottom-24 sm:right-6 sm:h-[min(720px,calc(100vh-7rem))] sm:w-[400px] sm:rounded-3xl sm:border sm:border-violet-100">
          <header className="flex items-center gap-3 border-b border-violet-50 bg-gradient-to-r from-violet-700 to-indigo-700 px-4 py-3 text-white sm:rounded-t-3xl">
            <HookoohAvatar size={40} />
            <div className="min-w-0 flex-1">
              <p className="font-bricolage text-sm font-bold">Hookooh</p>
              <p className="text-[11px] text-violet-100">YouTube AI Expert · Hook Better. Grow Smarter.</p>
            </div>
            <button type="button" className="rounded-lg p-1 hover:bg-white/10" onClick={() => setHistoryOpen((value) => !value)} aria-label="Chat history">
              <Icon name="ClockIcon" size={18} />
            </button>
            <button
              type="button"
              className="rounded-lg p-1 hover:bg-white/10"
              onClick={async () => {
                const created = await api('conversations', { method: 'POST', body: '{}' });
                setActiveId(created.id);
                setMessages([]);
              }}
              aria-label="New chat"
            >
              <Icon name="PlusIcon" size={18} />
            </button>
            <button type="button" className="rounded-lg p-1 hover:bg-white/10" onClick={() => setOpen(false)} aria-label="Close Hookooh">
              <Icon name="XMarkIcon" size={18} />
            </button>
          </header>

          {historyOpen ? (
            <div className="max-h-40 overflow-y-auto border-b border-slate-100 bg-slate-50 px-3 py-2 text-sm">
              {chats.length ? chats.map((chat) => (
                <div key={chat.id} className="flex items-center gap-2 py-1">
                  <button type="button" className={`flex-1 truncate text-left ${chat.id === activeId ? 'font-semibold text-violet-700' : 'text-slate-600'}`} onClick={() => { setActiveId(chat.id); setHistoryOpen(false); }}>
                    {chat.title}
                  </button>
                  <button type="button" className="text-slate-400" aria-label="Rename" onClick={async () => {
                    const title = window.prompt('Rename chat', chat.title);
                    if (!title) return;
                    await api(`conversations/${chat.id}`, { method: 'PATCH', body: JSON.stringify({ title }) });
                    setChats((current) => current.map((item) => (item.id === chat.id ? { ...item, title } : item)));
                  }}>
                    <Icon name="PencilSquareIcon" size={14} />
                  </button>
                  <button type="button" className="text-rose-400" aria-label="Delete" onClick={async () => {
                    if (!window.confirm('Delete this conversation?')) return;
                    await api(`conversations/${chat.id}`, { method: 'DELETE' });
                    setChats((current) => current.filter((item) => item.id !== chat.id));
                    if (activeId === chat.id) { setActiveId(''); setMessages([]); }
                  }}>
                    <Icon name="TrashIcon" size={14} />
                  </button>
                </div>
              )) : <p className="py-2 text-xs text-slate-400">No previous chats yet.</p>}
            </div>
          ) : null}

          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {!messages.length ? (
              <div>
                <p className="rounded-2xl bg-violet-50 px-3 py-3 text-sm leading-6 text-slate-700">{WELCOME}</p>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-violet-500">Ask Hookooh</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggestions.slice(0, 6).map((item) => (
                    <button key={item} type="button" className="rounded-full border border-violet-100 bg-white px-3 py-1.5 text-left text-xs font-medium text-violet-700 hover:bg-violet-50" onClick={() => send(item)}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {messages.map((item, index) => (
              <article key={item.id || index} className={item.role === 'user' ? 'ml-8 rounded-2xl bg-violet-700 px-3 py-2 text-sm text-white' : 'mr-4 rounded-2xl bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-800'}>
                {item.role === 'assistant' ? <div className="text-sm leading-6 text-slate-800">{formatReply(item.content)}</div> : <p className="whitespace-pre-wrap">{item.content}</p>}
                {item.role === 'assistant' ? (
                  <div className="mt-2 flex gap-2 text-slate-400">
                    <button type="button" aria-label="Copy" onClick={() => navigator.clipboard.writeText(item.content)}>
                      <Icon name="ClipboardIcon" size={14} />
                    </button>
                    {index === messages.length - 1 ? (
                      <button type="button" aria-label="Regenerate" onClick={() => regenerate()}>
                        <Icon name="ArrowPathIcon" size={14} />
                      </button>
                    ) : null}
                    {item.id ? (
                      <>
                        <button type="button" aria-label="Helpful" onClick={() => api(`messages/${item.id}/feedback`, { method: 'POST', body: JSON.stringify({ vote: 'up' }) })}>
                          <Icon name="HandThumbUpIcon" size={14} />
                        </button>
                        <button type="button" aria-label="Not helpful" onClick={() => api(`messages/${item.id}/feedback`, { method: 'POST', body: JSON.stringify({ vote: 'down' }) })}>
                          <Icon name="HandThumbDownIcon" size={14} />
                        </button>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}
            {busy ? <p className="text-xs text-violet-500">Hookooh is thinking…</p> : null}
            {error ? <p className="text-xs text-rose-600">{error}</p> : null}
          </div>

          <form
            className="flex gap-2 border-t border-slate-100 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask anything about YouTube..."
              className="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
            />
            <button type="submit" disabled={busy} className="rounded-2xl bg-violet-700 px-3 py-2 text-white disabled:opacity-50">
              <Icon name="PaperAirplaneIcon" size={16} />
            </button>
          </form>
        </section>
      ) : null}
    </>
  );
}
