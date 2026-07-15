'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import ContentEditorModal from '@/components/admin/ContentEditorModal';
import {
  CMS_SITE_PAGES,
  STATIC_LEGAL_PAGES,
  getStaticServicePages,
  type AdminSitePage,
  type AdminSiteSection,
} from '@/lib/cms/site-pages';

interface ContentRow {
  entry_key: string;
  updated_at?: string;
}

interface EditorState {
  entryKey: string;
  label: string;
}

function PageCard({
  page,
  updatedMap,
  onEdit,
}: {
  page: AdminSitePage;
  updatedMap: Record<string, string | undefined>;
  onEdit: (section: AdminSiteSection) => void;
}) {
  const [expanded, setExpanded] = useState(page.editable && page.sections.length <= 4);

  return (
    <article className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-foreground">{page.label}</h2>
            {!page.editable && (
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                Code-managed
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{page.description}</p>
          <Link
            href={page.route}
            target="_blank"
            className="text-xs text-primary hover:underline mt-1 inline-block"
          >
            {page.route} ↗
          </Link>
        </div>
        {page.sections.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 text-sm px-3 py-1.5 rounded-lg border border-border hover:bg-muted"
          >
            {expanded ? 'Hide sections' : `${page.sections.length} sections`}
          </button>
        )}
      </div>

      {expanded && page.sections.length > 0 && (
        <ul className="border-t border-border divide-y divide-border">
          {page.sections.map((section) => (
            <li
              key={section.entryKey}
              className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-muted/20"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm text-foreground">{section.label}</p>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <p className="text-xs text-muted-foreground font-mono">{section.entryKey}</p>
                  {section.hasMedia && (
                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                      Images / media
                    </span>
                  )}
                  {updatedMap[section.entryKey] && (
                    <span className="text-xs text-muted-foreground">
                      Updated {new Date(updatedMap[section.entryKey]!).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              {page.editable && (
                <button
                  type="button"
                  onClick={() => onEdit(section)}
                  className="shrink-0 text-sm font-medium text-primary hover:underline"
                >
                  Edit
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default function ContentAdminPage() {
  const [entries, setEntries] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<EditorState | null>(null);

  const load = useCallback(() => {
    fetch('/api/admin/content')
      .then((r) => r.json())
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updatedMap = entries.reduce<Record<string, string | undefined>>((acc, row) => {
    acc[row.entry_key] = row.updated_at;
    return acc;
  }, {});

  const servicePages = getStaticServicePages();
  const divisionPages = servicePages.filter((p) => p.id.startsWith('division-'));
  const planPages = servicePages.filter((p) => p.id.startsWith('plan-'));

  if (loading) return <p className="text-muted-foreground">Loading site content…</p>;

  return (
    <div className="space-y-8 max-w-4xl">
      <AdminPageHeader
        title="Site Content"
        description="Edit every page section to match your live website. Click Edit to open the section form in a popup — including image uploads."
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Main pages</h2>
        <div className="space-y-3">
          {CMS_SITE_PAGES.map((page) => (
            <PageCard
              key={page.id}
              page={page}
              updatedMap={updatedMap}
              onEdit={(section) => setEditor({ entryKey: section.entryKey, label: section.label })}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Service divisions
        </h2>
        <p className="text-sm text-muted-foreground">
          Division and package pages are defined in code. Use Page Indexing for their SEO settings.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {divisionPages.map((page) => (
            <PageCard key={page.id} page={page} updatedMap={updatedMap} onEdit={() => {}} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Service packages ({planPages.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {planPages.map((page) => (
            <PageCard key={page.id} page={page} updatedMap={updatedMap} onEdit={() => {}} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Legal pages</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STATIC_LEGAL_PAGES.map((page) => (
            <PageCard key={page.id} page={page} updatedMap={updatedMap} onEdit={() => {}} />
          ))}
        </div>
      </section>

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
