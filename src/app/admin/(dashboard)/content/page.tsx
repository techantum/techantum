'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import ContentEditorModal from '@/components/admin/ContentEditorModal';
import { CMS_SITE_PAGES, type AdminSitePage, type AdminSiteSection } from '@/lib/cms/site-pages';

interface ContentRow {
  entry_key: string;
  updated_at?: string;
}

export default function ContentAdminPage() {
  const [entries, setEntries] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(CMS_SITE_PAGES[0]?.id || '');
  const [editor, setEditor] = useState<{ entryKey: string; label: string } | null>(null);

  const load = useCallback(() => {
    fetch('/api/admin/content')
      .then((r) => r.json())
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updatedMap = useMemo(
    () =>
      entries.reduce<Record<string, string | undefined>>((acc, row) => {
        acc[row.entry_key] = row.updated_at;
        return acc;
      }, {}),
    [entries]
  );

  const selectedPage: AdminSitePage | undefined =
    CMS_SITE_PAGES.find((page) => page.id === selectedId) || CMS_SITE_PAGES[0];

  if (loading) return <p className="text-muted-foreground">Loading website content…</p>;

  return (
    <div className="w-full space-y-6">
      <AdminPageHeader
        title="Website Content"
        description="Pick a page, then edit each section. Images and videos are uploaded as files — no image URLs."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[16rem_minmax(0,1fr)] gap-5">
        <aside className="rounded-2xl border border-slate-200 bg-white p-3 h-fit">
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Pages</p>
          <nav className="space-y-1">
            {CMS_SITE_PAGES.map((page) => {
              const active = page.id === selectedPage?.id;
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => setSelectedId(page.id)}
                  className={`flex w-full items-start rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    active ? 'bg-secondary text-white' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>
                    <span className="block font-semibold">{page.label}</span>
                    <span className={`mt-0.5 block text-xs ${active ? 'text-white/80' : 'text-slate-500'}`}>
                      {page.sections.length} section{page.sections.length === 1 ? '' : 's'}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {selectedPage ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="font-bricolage text-xl font-bold text-slate-900">{selectedPage.label}</h2>
                  <p className="text-sm text-slate-500 mt-1">{selectedPage.description}</p>
                </div>
                <Link
                  href={selectedPage.route}
                  target="_blank"
                  className="shrink-0 text-sm font-semibold text-secondary hover:underline"
                >
                  View page ↗
                </Link>
              </div>
              <ul className="divide-y divide-slate-100">
                {selectedPage.sections.map((section: AdminSiteSection) => (
                  <li key={section.entryKey} className="flex items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{section.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {section.hasMedia ? 'Text + media upload' : 'Text'}
                        {updatedMap[section.entryKey]
                          ? ` · Updated ${new Date(updatedMap[section.entryKey]!).toLocaleDateString('en-IN')}`
                          : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditor({ entryKey: section.entryKey, label: section.label })}
                      className="shrink-0 rounded-full bg-secondary px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#d93b1e]"
                    >
                      Edit
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      </div>

      {editor && (
        <ContentEditorModal
          entryKey={editor.entryKey}
          label={editor.label}
          open={Boolean(editor)}
          onClose={() => setEditor(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
