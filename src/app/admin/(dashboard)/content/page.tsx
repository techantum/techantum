'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminButton from '@/components/admin/AdminButton';
import Icon from '@/components/ui/AppIcon';
import SafeImage from '@/components/ui/SafeImage';
import { CMS_SITE_PAGES, flattenAdminPages, serviceAdminPage, type AdminSitePage } from '@/lib/cms/site-pages';
import type { CmsEntryRow } from '@/lib/cms/merge-entries';

type CustomPage = { id: string; label: string; route: string; description: string; icon?: string };

function PageNavItem({
  page,
  selectedId,
  openMenus,
  onSelect,
  onToggle,
  depth = 0,
}: {
  page: AdminSitePage;
  selectedId?: string;
  openMenus: Record<string, boolean>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  depth?: number;
}) {
  const children = page.children || [];
  const hasChildren = children.length > 0;
  const open = Boolean(openMenus[page.id]);
  const active = page.id === selectedId;

  return (
    <div>
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => onSelect(page.id)}
          className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl py-2.5 pr-2 text-left text-sm transition-colors ${
            active ? 'bg-[#fdecea] text-secondary' : 'text-slate-700 hover:bg-slate-50'
          }`}
          style={{ paddingLeft: 12 + depth * 12 }}
        >
          <Icon name={page.icon || 'DocumentTextIcon'} size={18} className={active ? 'text-secondary' : 'text-slate-400'} />
          <span className="min-w-0 flex-1 font-semibold">{page.label}</span>
        </button>
        {hasChildren ? (
          <button
            type="button"
            className="mr-1 rounded-lg p-1.5 text-slate-400 hover:bg-[#fff5f3] hover:text-secondary"
            aria-label={`${open ? 'Collapse' : 'Expand'} ${page.label}`}
            aria-expanded={open}
            onClick={() => onToggle(page.id)}
          >
            <Icon name="ChevronDownIcon" size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        ) : null}
      </div>
      {hasChildren && open ? (
        <div className="ml-5 border-l border-slate-100 pl-1">
          {children.map((child) => (
            <PageNavItem
              key={child.id}
              page={child}
              selectedId={selectedId}
              openMenus={openMenus}
              onSelect={onSelect}
              onToggle={onToggle}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function previewUrl(content?: Record<string, unknown>) {
  if (!content) return '';
  for (const key of ['heroPosterUrl', 'image', 'imageUrl', 'thumbnail', 'poster', 'photo']) {
    const value = content[key];
    if (typeof value === 'string' && value) return value;
  }
  return '';
}

export default function ContentAdminPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<CmsEntryRow[]>([]);
  const [customPages, setCustomPages] = useState<CustomPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('homepage');
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState<'page' | 'service' | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState({ label: '', description: '' });
  const [settingsDraft, setSettingsDraft] = useState({ label: '', description: '', is_enabled: true });
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const [contentRes, pagesRes] = await Promise.all([fetch('/api/admin/content'), fetch('/api/admin/cms-pages')]);
    const content = await contentRes.json();
    const pages = await pagesRes.json().catch(() => ({ rows: [] }));
    setEntries(Array.isArray(content) ? content : []);
    setCustomPages(pages.rows || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pages: AdminSitePage[] = useMemo(() => {
    const isServicePage = (page: CustomPage) => page.description === 'service' || page.route.startsWith('/services/');
    const extraServices = customPages.filter(isServicePage);
    const extraGeneric = customPages.filter((page) => !isServicePage(page));
    const built = CMS_SITE_PAGES.map((page) => {
      if (page.id !== 'services') return page;
      const existing = new Set((page.children || []).map((child) => child.route));
      return {
        ...page,
        children: [
          ...(page.children || []),
          ...extraServices
            .filter((item) => !existing.has(item.route))
            .map((item) => serviceAdminPage(item.id, item.label, item.route)),
        ],
      };
    });
    const extra: AdminSitePage[] = extraGeneric.map((page) => ({
      id: page.id,
      label: page.label,
      route: page.route,
      description: page.description,
      icon: page.icon || 'DocumentTextIcon',
      editable: true,
      isSystem: false,
      sections: entries
        .filter((row) => row.entry_group === page.id || row.entry_key.startsWith(`custom.${page.id}.`))
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((row) => ({ entryKey: row.entry_key, label: row.label, blurb: '', hasMedia: true })),
    }));
    return [...built, ...extra];
  }, [customPages, entries]);

  const flatPages = useMemo(() => flattenAdminPages(pages), [pages]);
  const selectedPage = flatPages.find((page) => page.id === selectedId) || pages[0];

  useEffect(() => {
    const next: Record<string, boolean> = {};
    const markAncestors = (items: AdminSitePage[]): boolean => {
      let matched = false;
      for (const item of items) {
        if (item.id === selectedId) {
          if (item.children?.length) next[item.id] = true;
          matched = true;
        }
        if (item.children?.length && markAncestors(item.children)) {
          next[item.id] = true;
          matched = true;
        }
      }
      return matched;
    };
    markAncestors(pages);
    setOpenMenus(next);
  }, [selectedId, pages]);
  const entryMap = useMemo(() => Object.fromEntries(entries.map((row) => [row.entry_key, row])), [entries]);

  const orderedSections = useMemo(() => {
    if (!selectedPage) return [];
    return [...selectedPage.sections].sort((a, b) => (entryMap[a.entryKey]?.sort_order || 0) - (entryMap[b.entryKey]?.sort_order || 0));
  }, [selectedPage, entryMap]);

  const toggleSection = async (entryKey: string, enabled: boolean) => {
    await fetch(`/api/admin/content/${encodeURIComponent(entryKey)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_enabled: enabled }),
    });
    await load();
  };

  const moveSection = async (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= orderedSections.length) return;
    const swapped = [...orderedSections];
    [swapped[index], swapped[next]] = [swapped[next], swapped[index]];
    await fetch('/api/admin/content/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders: swapped.map((section, sort_order) => ({ entry_key: section.entryKey, sort_order })) }),
    });
    await load();
  };

  const addPage = async () => {
    setMessage('');
    const response = await fetch('/api/admin/cms-pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...draft, kind: adding === 'service' ? 'service' : 'page' }),
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error || 'Could not add the page');
      return;
    }
    setAdding(null);
    setDraft({ label: '', description: '' });
    await load();
    setSelectedId(body.id);
    if (adding === 'service') setOpenMenus((prev) => ({ ...prev, services: true }));
  };

  const savePageSettings = async () => {
    if (!selectedPage) return;
    setMessage('');
    if (selectedPage.isSystem) {
      setSettingsOpen(false);
      return;
    }
    const response = await fetch('/api/admin/cms-pages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedPage.id, ...settingsDraft }),
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error || 'Could not update page settings');
      return;
    }
    setSettingsOpen(false);
    await load();
  };

  if (loading) return <p className="text-slate-500">Loading website content…</p>;

  return (
    <div className="flex h-[calc(100vh-7.5rem)] min-h-[36rem] w-full flex-col gap-4">
      <AdminPageHeader kicker="Website Content" title="Website Content" />
      {message ? <p className="text-sm text-rose-600">{message}</p> : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-2 px-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pages</p>
            <div className="flex gap-1">
              <button type="button" onClick={() => setAdding('page')} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-white">
                <Icon name="PlusIcon" size={12} /> Page
              </button>
              <button type="button" onClick={() => setAdding('service')} className="inline-flex items-center gap-1 rounded-full border border-secondary/20 bg-[#fdecea] px-2.5 py-1 text-xs font-semibold text-secondary">
                <Icon name="PlusIcon" size={12} /> Service
              </button>
            </div>
          </div>
          <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
            {pages.map((page) => (
              <PageNavItem
                key={page.id}
                page={page}
                selectedId={selectedPage?.id}
                openMenus={openMenus}
                onSelect={(id) => setSelectedId(id === 'services' ? 'services-all' : id)}
                onToggle={(id) => setOpenMenus((prev) => ({ ...prev, [id]: !prev[id] }))}
              />
            ))}
          </nav>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {selectedPage ? (
            <>
              <div className="flex shrink-0 flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-bricolage text-xl font-bold text-slate-900">{selectedPage.label}</h2>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link href={selectedPage.route} target="_blank" className="inline-flex h-10 items-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700">
                    View page
                  </Link>
                  <AdminButton
                    variant="primary"
                    onClick={() => {
                      setSettingsDraft({
                        label: selectedPage.label,
                        description: selectedPage.description,
                        is_enabled: true,
                      });
                      setSettingsOpen(true);
                    }}
                  >
                    Page Settings
                  </AdminButton>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <div className="mb-3 flex items-center justify-end">
                  <Link href={selectedPage.route} target="_blank" className="text-sm font-semibold text-secondary">
                    Preview page
                  </Link>
                </div>
                <ul className="space-y-2">
                  {orderedSections.map((section, index) => {
                    const row = entryMap[section.entryKey];
                    const enabled = row?.is_enabled !== false;
                    const thumb = previewUrl(row?.content);
                    return (
                      <li key={section.entryKey} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-3">
                        <div className="flex flex-col gap-1 text-slate-300">
                          <button type="button" onClick={() => moveSection(index, -1)} aria-label="Move up">
                            <Icon name="Bars3Icon" size={16} />
                          </button>
                        </div>
                        <span className="w-6 text-center text-sm font-semibold text-slate-400">{index + 1}</span>
                        <div className="h-12 w-16 overflow-hidden rounded-lg bg-slate-100">
                          {thumb ? (
                            <SafeImage src={thumb} alt="" className="h-full w-full object-cover" fallback={<div className="flex h-full items-center justify-center text-slate-300"><Icon name="PhotoIcon" size={18} /></div>} />
                          ) : (
                            <div className="flex h-full items-center justify-center text-slate-300"><Icon name="PhotoIcon" size={18} /></div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900">{section.label}</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={enabled}
                          onClick={() => toggleSection(section.entryKey, !enabled)}
                          className={`relative h-6 w-11 rounded-full ${enabled ? 'bg-secondary' : 'bg-slate-200'}`}
                        >
                          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${enabled ? 'left-5' : 'left-0.5'}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(`/admin/content/${encodeURIComponent(section.entryKey)}`)}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700"
                        >
                          <Icon name="PencilSquareIcon" size={14} /> Edit
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          ) : null}
        </section>
      </div>

      {adding ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="font-bricolage text-lg font-bold">{adding === 'service' ? 'Add Service' : 'Add Page'}</h3>
            <label className="mt-4 block text-sm font-medium">{adding === 'service' ? 'Service name' : 'Page name'}
              <input className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3" value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} />
            </label>
            {adding === 'page' ? (
              <label className="mt-3 block text-sm font-medium">Description
                <input className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
              </label>
            ) : (
              <p className="mt-3 text-sm text-slate-500">Creates a service detail page using the same layout as Website Development.</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <AdminButton onClick={() => setAdding(null)}>Cancel</AdminButton>
              <AdminButton variant="primary" onClick={addPage}>{adding === 'service' ? 'Create service' : 'Create page'}</AdminButton>
            </div>
          </div>
        </div>
      ) : null}

      {settingsOpen && selectedPage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="font-bricolage text-lg font-bold">Page Settings</h3>
            <p className="mt-1 text-sm text-slate-500">Public URL: {selectedPage.route}</p>
            <label className="mt-4 block text-sm font-medium">Page name
              <input
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3"
                value={settingsDraft.label}
                disabled={selectedPage.isSystem}
                onChange={(event) => setSettingsDraft({ ...settingsDraft, label: event.target.value })}
              />
            </label>
            <label className="mt-3 block text-sm font-medium">Description
              <input
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3"
                value={settingsDraft.description}
                disabled={selectedPage.isSystem}
                onChange={(event) => setSettingsDraft({ ...settingsDraft, description: event.target.value })}
              />
            </label>
            {selectedPage.isSystem ? (
              <p className="mt-3 text-xs text-slate-500">System pages keep a fixed name and URL. Edit sections to change public content.</p>
            ) : (
              <label className="mt-3 flex items-center justify-between text-sm font-medium">
                Published
                <button
                  type="button"
                  role="switch"
                  aria-checked={settingsDraft.is_enabled}
                  onClick={() => setSettingsDraft({ ...settingsDraft, is_enabled: !settingsDraft.is_enabled })}
                  className={`relative h-6 w-11 rounded-full ${settingsDraft.is_enabled ? 'bg-secondary' : 'bg-slate-200'}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${settingsDraft.is_enabled ? 'left-5' : 'left-0.5'}`} />
                </button>
              </label>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <AdminButton onClick={() => setSettingsOpen(false)}>Cancel</AdminButton>
              <AdminButton variant="primary" onClick={savePageSettings}>Save</AdminButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
