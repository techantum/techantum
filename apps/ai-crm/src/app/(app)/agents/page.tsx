'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Badge, Btn, Card, Field, PageTitle, inputClass } from '@/components/ui';
import { StatusBanner } from '@/components/StatusBanner';
import { api } from '@/lib/api-client';

export default function AgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [agent, setAgent] = useState<any>(null);
  const [knowledge, setKnowledge] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [providers, setProviders] = useState<any>({});
  const [prompt, setPrompt] = useState('');
  const [kbTitle, setKbTitle] = useState('');
  const [kbContent, setKbContent] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const [list, workspace] = await Promise.all([api('/api/v1/agents'), api('/api/v1/workspace')]);
    setAgents(list.agents || []);
    setKnowledge(list.knowledge || []);
    setProviders(workspace.providers || {});
    const current = list.agents?.[0];
    if (current) {
      setAgent(current);
      const detail = await api(`/api/v1/agents/${current.id}`);
      setMessages(detail.messages || []);
      setKnowledge(detail.knowledge || list.knowledge || []);
    }
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function save(e?: FormEvent) {
    e?.preventDefault();
    if (!agent) return;
    setSaving(true);
    try {
      const body = await api(`/api/v1/agents/${agent.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: agent.name,
          description: agent.description,
          instructions: agent.instructions,
          languages: agent.languages,
          scoringRules: agent.scoring_rules,
          status: 'published',
        }),
      });
      setAgent(body.agent);
      setMessage('Agent configuration saved to database.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function runTest(e: FormEvent) {
    e.preventDefault();
    if (!agent || !prompt.trim()) return;
    const result = await api(`/api/v1/agents/${agent.id}/test`, {
      method: 'POST',
      body: JSON.stringify({ message: prompt }),
    });
    setPrompt('');
    setMessage(`Reply via ${result.provider}`);
    const detail = await api(`/api/v1/agents/${agent.id}`);
    setMessages(detail.messages || []);
  }

  async function addKnowledge(e: FormEvent) {
    e.preventDefault();
    if (!agent) return;
    await api('/api/v1/agents/knowledge', {
      method: 'POST',
      body: JSON.stringify({ agentId: agent.id, title: kbTitle, content: kbContent, docType: 'faq' }),
    });
    setKbTitle('');
    setKbContent('');
    await load();
  }

  if (error) return <p className="text-rose-600">{error}</p>;
  if (!agent) return <p className="text-slate-500">Loading agents…</p>;

  return (
    <div>
      <PageTitle
        title="AI Agent Configuration"
        subtitle="Persisted agent instructions, knowledge and live LLM test chat."
        actions={
          <>
            <Btn variant="secondary" disabled={saving} onClick={() => save()}>
              Save
            </Btn>
            <Btn disabled={saving} onClick={() => save()}>
              Publish version
            </Btn>
          </>
        }
      />
      {!providers.llm ? (
        <StatusBanner tone="warn">OPENAI_API_KEY missing — test replies use deterministic offline rules until LLM is available.</StatusBanner>
      ) : (
        <StatusBanner tone="ok">LLM provider is connected. Replies are generated live.</StatusBanner>
      )}
      {message ? <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</div> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <form onSubmit={save} className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold">Agent identity</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Field label="Agent name">
                <input className={inputClass} value={agent.name || ''} onChange={(e) => setAgent({ ...agent, name: e.target.value })} />
              </Field>
              <Field label="Channel">
                <input className={inputClass} value={agent.channel || ''} disabled />
              </Field>
            </div>
            <Field label="Description">
              <input className={`${inputClass} mt-3`} value={agent.description || ''} onChange={(e) => setAgent({ ...agent, description: e.target.value })} />
            </Field>
            <Field label="System instructions">
              <textarea
                className={`${inputClass} mt-3 min-h-[160px]`}
                value={agent.instructions || ''}
                onChange={(e) => setAgent({ ...agent, instructions: e.target.value })}
              />
            </Field>
            <div className="mt-3 text-xs text-slate-500">
              Version v{agent.version} · {agents.length} agent(s) in workspace
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold">Languages (Indian multilingual)</h3>
            <p className="mt-1 text-xs text-slate-500">Default six: English, Hindi, Bengali, Tamil, Telugu, Marathi. Detection + TTS quality depend on STT/TTS vendor voices.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {['en', 'hi', 'bn', 'ta', 'te', 'mr', 'kn'].map((lang) => {
                const active = (agent.languages || []).includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => {
                      const set = new Set(agent.languages || []);
                      if (set.has(lang)) set.delete(lang);
                      else set.add(lang);
                      setAgent({ ...agent, languages: Array.from(set) });
                    }}
                    className={`rounded-full px-3 py-1 text-xs ${active ? 'bg-secondary text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    {lang}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold">Knowledge base / RAG</h3>
            <p className="mt-1 text-xs text-slate-500">Upload FAQs and retail call transcripts — chunks are embedded for retrieval-augmented replies.</p>
            <ul className="mt-3 space-y-2 text-sm">
              {knowledge.map((doc) => (
                <li key={doc.id} className="rounded-xl border border-slate-100 p-3">
                  <div className="font-medium">{doc.title}</div>
                  <div className="text-xs text-slate-500">
                    {doc.doc_type} · v{doc.version} · {doc.status}
                  </div>
                </li>
              ))}
              {!knowledge.length ? <li className="text-slate-400">No knowledge documents yet</li> : null}
            </ul>
            <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
              <input className={inputClass} placeholder="Document title" value={kbTitle} onChange={(e) => setKbTitle(e.target.value)} />
              <textarea className={inputClass} rows={3} placeholder="Content" value={kbContent} onChange={(e) => setKbContent(e.target.value)} />
              <Btn type="button" variant="secondary" onClick={addKnowledge as any}>
                Upload / save document
              </Btn>
            </div>
          </Card>
        </form>

        <Card className="flex min-h-[420px] flex-col p-4">
          <h3 className="font-semibold">Live test conversation</h3>
          <div className="crm-scroll mt-3 flex-1 space-y-2 overflow-auto">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-2xl px-3 py-2 text-sm ${m.role === 'assistant' ? 'bg-secondary text-white' : 'bg-slate-100 text-slate-800'}`}
              >
                {m.body}
              </div>
            ))}
            {!messages.length ? <p className="text-sm text-slate-400">No test messages yet</p> : null}
          </div>
          <form onSubmit={runTest} className="mt-3 flex gap-2">
            <input className={inputClass} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Send a test customer message" />
            <Btn type="submit">Send</Btn>
          </form>
        </Card>
      </div>
    </div>
  );
}
