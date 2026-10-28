'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import PageLoader from '@/components/admin/youtube/PageLoader';
import { allow, useYoutubeAccess, useYoutubePageBase, youtubeApiPrefix, youtubePortalHeader, yt } from '@/components/admin/youtube/YoutubeFrame';
import Icon from '@/components/ui/AppIcon';
import { PLAYBOOK_CATEGORIES, PLAYBOOK_SOURCE } from '@/lib/youtube/youtube-master-playbook';

const CATEGORY_LABEL: Record<string, string> = {
  packaging: 'Packaging',
  titles: 'Titles',
  thumbnails: 'Thumbnails',
  retention: 'Retention',
  seo: 'SEO',
  audience: 'Audience',
  standards: 'Brand Guidelines',
  channel: 'Channel',
  content: 'Content Ideas',
  engagement: 'Engagement',
  publishing: 'Publishing',
  shorts: 'Shorts',
  analytics: 'Analytics',
  competitors: 'Competitors',
  experiments: 'Strategy',
  global: 'Global',
};

type Row = {
  id: string;
  title: string;
  body: string;
  category: string;
  enabled: boolean;
  source_name?: string | null;
  created_at?: string;
  updated_at: string;
};

function rowType(row: Row) {
  if (row.source_name === PLAYBOOK_SOURCE) return 'Playbook';
  if (row.source_name) return 'File';
  return 'Note';
}

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function typeIcon(row: Row) {
  const kind = rowType(row);
  if (kind === 'File') {
    const name = (row.source_name || '').toLowerCase();
    if (name.endsWith('.pdf')) return { icon: 'DocumentIcon', tone: 'bg-rose-50 text-rose-500' };
    return { icon: 'DocumentTextIcon', tone: 'bg-sky-50 text-sky-600' };
  }
  if (kind === 'Playbook') return { icon: 'BookOpenIcon', tone: 'bg-violet-50 text-violet-600' };
  return { icon: 'PencilSquareIcon', tone: 'bg-fuchsia-50 text-fuchsia-600' };
}

export default function YoutubeTrainingPage() {
  const base = useYoutubePageBase();
  const access = useYoutubeAccess();
  const manage = allow(access, 'youtube_research.hookooh.knowledge');
  const [rows, setRows] = useState<Row[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const load = async () => {
    const payload = await yt('ai-training');
    setRows(payload.rows || []);
  };

  useEffect(() => {
    load().catch((err) => setError(err.message)).finally(() => setReady(true));
  }, []);

  const resetForm = () => {
    setTitle('');
    setBody('');
    setCategory('');
    setFiles([]);
    setEditing(null);
  };

  const save = async () => {
    if (!title.trim()) {
      setError('Enter a name for this training content.');
      return;
    }
    if (!category) {
      setError('Select a category.');
      return;
    }
    setBusy('save');
    setError('');
    try {
      if (editing) {
        await yt('ai-training', { method: 'POST', body: JSON.stringify({ ...editing, title, body, category }) });
        setMessage('Training content updated.');
      } else if (files.length) {
        const form = new FormData();
        form.append('title', title);
        form.append('category', category);
        form.append('notes', body);
        files.forEach((file) => form.append('files', file));
        const response = await fetch(`${youtubeApiPrefix()}/ai-training`, {
          method: 'POST',
          headers: youtubePortalHeader(),
          body: form,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Could not save training content');
        setMessage(`Saved ${payload.imported || 1} item${payload.imported === 1 ? '' : 's'} to Hookooh.`);
      } else {
        await yt('ai-training', { method: 'POST', body: JSON.stringify({ title, body, category, enabled: true }) });
        setMessage('Training note saved. Hookooh AI Agent will use it on the next Key Insights run.');
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save training');
    } finally {
      setBusy('');
    }
  };

  const addFiles = (list: FileList | File[]) => {
    const next = [...list].filter((file) => file.size <= 10_000_000);
    setFiles((current) => [...current, ...next].slice(0, 8));
  };

  const toggle = async (row: Row) => {
    setBusy(row.id);
    try {
      await yt('ai-training', { method: 'POST', body: JSON.stringify({ ...row, enabled: !row.enabled }) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update training');
    } finally {
      setBusy('');
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Remove this training content?')) return;
    setBusy(id);
    try {
      await yt(`ai-training/${id}`, { method: 'DELETE' });
      if (editing?.id === id) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete training');
    } finally {
      setBusy('');
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const kind = rowType(row);
      if (typeFilter === 'file' && kind !== 'File') return false;
      if (typeFilter === 'note' && kind !== 'Note') return false;
      if (typeFilter === 'playbook' && kind !== 'Playbook') return false;
      if (!q) return true;
      return `${row.title} ${row.category} ${row.source_name || ''} ${row.body}`.toLowerCase().includes(q);
    });
  }, [rows, search, typeFilter]);

  if (!ready && !error) return <PageLoader label="Loading Hookooh training…" />;

  const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100';

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bricolage text-3xl font-bold tracking-tight text-slate-900">Hookooh Knowledge Library</h1>
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">Beta</span>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Train Hookooh on approved YouTube mastery playbooks and extra documents. Agent Users can chat with Hookooh; only Super Admin and Agent Admin can change this library.
          </p>
        </div>
        <Link href="/settings" className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
          <Icon name="ArrowLeftIcon" size={16} /> Back to Settings
        </Link>
      </div>

      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
            <Icon name="BookOpenIcon" size={18} />
          </span>
          <h2 className="font-bricolage text-lg font-semibold text-slate-900">How to train Hookooh</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: 'CloudArrowUpIcon', tone: 'bg-violet-50 text-violet-600', title: '1. Upload content', body: 'Upload documents, notes or training material for your YouTube business.' },
            { icon: 'PencilSquareIcon', tone: 'bg-sky-50 text-sky-600', title: '2. Add notes', body: 'Add short notes, examples or instructions to guide the agent.' },
            { icon: 'BoltIcon', tone: 'bg-fuchsia-50 text-fuchsia-600', title: '3. Train', body: 'Hookooh AI Agent will analyse the content and learn your YouTube context.' },
            { icon: 'ChatBubbleLeftRightIcon', tone: 'bg-emerald-50 text-emerald-600', title: '4. Use it', body: 'Start asking questions and get accurate, relevant YouTube insights.' },
          ].map((item) => (
            <article key={item.title} className="rounded-2xl bg-slate-50/80 p-4">
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${item.tone}`}>
                <Icon name={item.icon} size={20} />
              </span>
              <p className="mt-3 text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      {manage ? (
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <Icon name="DocumentPlusIcon" size={18} />
            </span>
            <div>
              <h2 className="font-bricolage text-lg font-semibold text-slate-900">{editing ? 'Edit training content' : 'Add Training Content'}</h2>
              <p className="text-sm text-slate-500">Upload files and add notes to train Hookooh AI Agent.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">Name <span className="text-rose-500">*</span>
              <input className={`${inputClass} mt-1.5`} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. YouTube Strategy Guide" />
            </label>
            <label className="text-sm font-medium text-slate-700">Category <span className="text-rose-500">*</span>
              <select className={`${inputClass} mt-1.5`} value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="">Select category</option>
                {PLAYBOOK_CATEGORIES.map((item) => <option key={item} value={item}>{CATEGORY_LABEL[item] || item}</option>)}
              </select>
            </label>
          </div>
          {!editing ? (
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-700">Upload Files (Optional)</p>
              <label
                className={`mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-10 text-center transition ${dragOver ? 'border-violet-400 bg-violet-50' : 'border-violet-200 bg-violet-50/40 hover:border-violet-300'}`}
                onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOver(false);
                  if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
                }}
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-violet-500 shadow-sm">
                  <Icon name="CloudArrowUpIcon" size={24} />
                </span>
                <p className="mt-3 text-sm text-slate-600">
                  Drag & drop files here or <span className="font-semibold text-violet-700">browse</span>
                </p>
                <p className="mt-1 text-xs text-slate-400">Supports PDF, DOC, DOCX, TXT, PPT, PPTX (Max 10MB each)</p>
                <input
                  type="file"
                  multiple
                  accept=".txt,.md,.csv,.json,.pdf,.doc,.docx,.ppt,.pptx"
                  className="hidden"
                  onChange={(event) => {
                    if (event.target.files?.length) addFiles(event.target.files);
                    event.target.value = '';
                  }}
                />
              </label>
              {files.length ? (
                <ul className="mt-3 space-y-2">
                  {files.map((file) => (
                    <li key={`${file.name}-${file.size}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                      <span className="truncate text-slate-700">{file.name}</span>
                      <button type="button" className="text-slate-400 hover:text-rose-500" onClick={() => setFiles(files.filter((item) => item !== file))} aria-label={`Remove ${file.name}`}>
                        <Icon name="XMarkIcon" size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          <label className="mt-4 block text-sm font-medium text-slate-700">Notes (Optional)
            <textarea
              className={`${inputClass} mt-1.5 min-h-28 py-3`}
              maxLength={1000}
              value={body}
              onChange={(event) => setBody(event.target.value.slice(0, 1000))}
              placeholder="Write a short note, key points or examples..."
            />
            <span className="mt-1 block text-right text-xs text-slate-400">{body.length}/1000</span>
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex h-11 items-center rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-violet-500 disabled:opacity-60"
              disabled={busy === 'save'}
              onClick={() => void save()}
            >
              {busy === 'save' ? 'Saving…' : editing ? 'Update content' : 'Save to Hookooh'}
            </button>
            {editing ? (
              <button type="button" className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600" onClick={resetForm}>
                Cancel
              </button>
            ) : null}
          </div>
        </section>
      ) : (
        <p className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-500">View-only. Settings access is required to add or upload training content.</p>
      )}

      <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <Icon name="QueueListIcon" size={18} />
            </span>
            <div>
              <h2 className="font-bricolage text-lg font-semibold text-slate-900">Training Content</h2>
              <p className="text-xs text-slate-500">Manage your uploaded files and notes. You can disable or remove any content.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <Icon name="MagnifyingGlassIcon" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="h-10 w-52 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-violet-400" placeholder="Search content..." value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="all">All types</option>
              <option value="file">Files</option>
              <option value="note">Notes</option>
              <option value="playbook">Playbook</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Added on</th>
                <th className="px-5 py-3">Status</th>
                {manage ? <th className="px-5 py-3 text-right">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const kind = rowType(row);
                const mark = typeIcon(row);
                return (
                  <tr key={row.id} className="border-t border-slate-50">
                    <td className="px-5 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${mark.tone}`}>
                          <Icon name={mark.icon} size={18} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900" title={row.title}>{row.title}</p>
                          {row.source_name && row.source_name !== PLAYBOOK_SOURCE ? <p className="truncate text-xs text-slate-400">{row.source_name}</p> : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${kind === 'File' ? 'bg-rose-50 text-rose-600' : kind === 'Note' ? 'bg-fuchsia-50 text-fuchsia-700' : 'bg-violet-50 text-violet-700'}`}>{kind}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{CATEGORY_LABEL[row.category] || row.category}</td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(row.created_at || row.updated_at)}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                        <span className={`h-2 w-2 rounded-full ${row.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        {row.enabled ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {manage ? (
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className={`relative h-6 w-11 rounded-full ${row.enabled ? 'bg-emerald-500' : 'bg-slate-200'}`}
                            disabled={busy === row.id}
                            onClick={() => void toggle(row)}
                            aria-label={row.enabled ? 'Disable' : 'Enable'}
                          >
                            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow ${row.enabled ? 'right-0.5' : 'left-0.5'}`} />
                          </button>
                          <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700" onClick={() => { setEditing(row); setTitle(row.title); setBody(row.body.slice(0, 1000)); setCategory(row.category); setFiles([]); window.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-label="Edit">
                            <Icon name="PencilIcon" size={16} />
                          </button>
                          <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" disabled={busy === row.id} onClick={() => void remove(row.id)} aria-label="Delete">
                            <Icon name="TrashIcon" size={16} />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
              {!filtered.length ? (
                <tr>
                  <td colSpan={manage ? 6 : 5} className="px-5 py-12 text-center text-sm text-slate-500">No training content in this view.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {manage ? <HookoohTester /> : null}
    </div>
  );
}

function HookoohTester() {
  const [prompt, setPrompt] = useState('');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
      <h2 className="font-bricolage text-lg font-bold text-slate-900">Test Hookooh AI Agent</h2>
      <p className="mt-1 text-sm text-slate-500">Send a YouTube question against the enabled knowledge. Disabled documents are excluded.</p>
      <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={3} className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Why are my YouTube videos getting fewer views?" />
      <button
        type="button"
        disabled={busy}
        className="mt-3 rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            const response = await fetch('/api/hookooh/test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: prompt }) });
            const body = await response.json();
            if (!response.ok) throw new Error(body.error || 'Test failed');
            setReply(body.text || '');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Test failed');
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Asking Hookooh…' : 'Run test'}
      </button>
      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
      {reply ? <pre className="mt-3 whitespace-pre-wrap rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">{reply}</pre> : null}
    </section>
  );
}
