'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import ContentEditorModal from '@/components/admin/ContentEditorModal';
import { CONTENT_BRIEF_SECTIONS, getBriefCompletion } from '@/lib/content-brief';

interface ContentRow {
  entry_key: string;
  updated_at?: string;
}

interface EditorState {
  entryKey: string;
  label: string;
}

export default function ContentBriefPage() {
  const [entries, setEntries] = useState<ContentRow[]>([]);
  const [brandingComplete, setBrandingComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<EditorState | null>(null);

  const load = useCallback(() => {
    Promise.all([fetch('/api/admin/content'), fetch('/api/admin/branding')])
      .then(async ([contentRes, brandingRes]) => {
        const content = await contentRes.json();
        const branding = await brandingRes.json();
        setEntries(content);
        setBrandingComplete(Boolean(branding?.company_name && branding?.email));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filledKeys = new Set(entries.filter((e) => e.updated_at).map((e) => e.entry_key));
  const completion = getBriefCompletion(filledKeys, brandingComplete);

  if (loading) return <p className="text-muted-foreground">Loading content brief…</p>;

  return (
    <div className="space-y-8 max-w-4xl">
      <AdminPageHeader
        title="Content Brief"
        description="UI/UX design questionnaire — track what information has been provided for the KEIL website."
        action={
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{completion.percent}%</p>
            <p className="text-xs text-muted-foreground">
              {completion.filled} of {completion.total} sections started
            </p>
          </div>
        }
      />

      <div className="space-y-4">
        {CONTENT_BRIEF_SECTIONS.map((section) => {
          const sectionFilled = section.cmsKeys.some((key) => filledKeys.has(key));
          const isBranding = section.id === 8;
          const done = isBranding ? brandingComplete : sectionFilled;

          return (
            <article
              key={section.id}
              className={`bg-white rounded-xl border p-5 ${done ? 'border-green-200' : 'border-border'}`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Section {section.id}
                  </p>
                  <h2 className="font-semibold text-foreground text-lg">{section.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full shrink-0 ${
                    done ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {done ? 'Started' : 'Pending'}
                </span>
              </div>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-4">
                {section.checklist.map((item) => (
                  <li key={item} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-primary">·</span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-2">
                {section.adminHref && (
                  <Link
                    href={section.adminHref}
                    className="text-sm px-3 py-1.5 rounded-lg border border-border hover:bg-muted"
                  >
                    Open {section.id === 8 ? 'Branding' : section.id === 10 ? 'SEO' : 'Site Content'}
                  </Link>
                )}
                {section.cmsKeys.map((key) => {
                  const meta = entries.find((e) => e.entry_key === key);
                  if (!meta) return null;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setEditor({ entryKey: key, label: key.split('.').pop() || key })}
                      className="text-sm px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/15"
                    >
                      Edit {key.split('.').slice(1).join(' ')}
                    </button>
                  );
                })}
              </div>
            </article>
          );
        })}
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
