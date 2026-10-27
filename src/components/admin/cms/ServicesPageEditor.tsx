'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminButton from '@/components/admin/AdminButton';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Icon from '@/components/ui/AppIcon';
import { mergeCmsContent } from '@/lib/cms/default-content';

export type ServiceCategoryDraft = {
  id: string;
  name: string;
  description: string;
  href: string;
  icon: string;
  iconClass: string;
  bgClass: string;
  offerings: string;
  published: boolean;
};

type Draft = {
  title: string;
  description: string;
  cta: string;
  ctaHref: string;
  categories: ServiceCategoryDraft[];
};

const inputClass =
  'mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20';
const areaClass =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20';

function asCategory(raw: unknown, index: number): ServiceCategoryDraft {
  const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    id: String(row.id || `cat_${index + 1}`),
    name: String(row.name || ''),
    description: String(row.description || ''),
    href: String(row.href || ''),
    icon: String(row.icon || 'CubeIcon'),
    iconClass: String(row.iconClass || 'text-primary'),
    bgClass: String(row.bgClass || 'bg-primary/10'),
    offerings: String(row.offerings ?? ''),
    published: row.published !== false,
  };
}

function emptyCategory(index: number): ServiceCategoryDraft {
  return {
    id: `cat_${Date.now()}_${index}`,
    name: 'New service',
    description: '',
    href: '/services',
    icon: 'CubeIcon',
    iconClass: 'text-primary',
    bgClass: 'bg-primary/10',
    offerings: '0',
    published: true,
  };
}

export default function ServicesPageEditor() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>({ title: '', description: '', cta: '', ctaHref: '', categories: [] });
  const [openId, setOpenId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/content/services.page').then((r) => r.json()),
      fetch('/api/admin/content/services.hero').then((r) => r.json()),
    ]).then(([pageRow, heroRow]) => {
      const page = mergeCmsContent('services.page', pageRow.content);
      const hero = mergeCmsContent('services.hero', heroRow.content);
      const categories = Array.isArray(page.categories) ? page.categories.map(asCategory) : [];
      setDraft({
        title: String(page.title || page.exploreTitle || hero.title || ''),
        description: String(page.description || hero.description || '').replace(/<[^>]+>/g, ''),
        cta: String(page.cta || page.primaryCta || ''),
        ctaHref: String(page.ctaHref || page.primaryCtaHref || '/contact'),
        categories,
      });
      setOpenId(categories[0]?.id || '');
    }).finally(() => setLoading(false));
  }, []);

  const updateCategory = (id: string, patch: Partial<ServiceCategoryDraft>) => {
    setDraft((prev) => ({
      ...prev,
      categories: prev.categories.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const addCategory = () => {
    const next = emptyCategory(draft.categories.length);
    setDraft((prev) => ({ ...prev, categories: [...prev.categories, next] }));
    setOpenId(next.id);
  };

  const duplicateCategory = (id: string) => {
    const source = draft.categories.find((item) => item.id === id);
    if (!source) return;
    const copy = { ...source, id: `${source.id}_copy_${Date.now()}`, name: `${source.name} copy` };
    setDraft((prev) => ({ ...prev, categories: [...prev.categories, copy] }));
    setOpenId(copy.id);
  };

  const removeCategory = (id: string) => {
    setDraft((prev) => ({ ...prev, categories: prev.categories.filter((item) => item.id !== id) }));
  };

  const moveCategory = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= draft.categories.length) return;
    const categories = [...draft.categories];
    [categories[index], categories[next]] = [categories[next], categories[index]];
    setDraft((prev) => ({ ...prev, categories }));
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const payload = {
        exploreTitle: draft.title,
        title: draft.title,
        description: draft.description,
        cta: draft.cta,
        ctaHref: draft.ctaHref,
        categories: draft.categories,
      };
      const [pageRes, heroRes] = await Promise.all([
        fetch('/api/admin/content/services.page', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entry_group: 'services', label: 'Services Page', content: payload, is_enabled: true }),
        }),
        fetch('/api/admin/content/services.hero', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entry_group: 'services',
            label: 'Services Hero',
            content: { eyebrow: 'Our Services', title: draft.title, description: draft.description },
            is_enabled: true,
          }),
        }),
      ]);
      if (!pageRes.ok || !heroRes.ok) throw new Error('Save failed');
      setMessage('Changes saved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-slate-500">Loading services page…</p>;

  return (
    <div className="flex min-h-[calc(100vh-7.5rem)] w-full flex-col gap-5">
      <p className="text-xs text-slate-400">
        Content & Brand <span className="px-1">›</span> Website Content <span className="px-1">›</span> Services <span className="px-1">›</span> Edit Services Page
      </p>
      <AdminPageHeader
        kicker=""
        title="Edit Services Page"
        description="Manage the content and settings for your services section. This content will appear on your website."
        action={
          <div className="flex gap-2">
            <AdminButton onClick={() => router.push('/admin/content')}>Back</AdminButton>
            <AdminButton variant="primary" loading={saving} onClick={save}>Save Changes</AdminButton>
          </div>
        }
      />
      {message ? <p className={`text-sm ${message.toLowerCase().includes('fail') ? 'text-rose-600' : 'text-emerald-700'}`}>{message}</p> : null}

      <div className="min-h-0 flex-1">
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fdecea] text-secondary">
                <Icon name="DocumentTextIcon" size={18} />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Section Content</h2>
                <p className="text-xs text-slate-500">Set the main content for the services section appearing on your website.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Section title
                <input className={inputClass} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
              </label>
              <label className="text-sm font-medium text-slate-700">Section description
                <input className={inputClass} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
              </label>
              <label className="text-sm font-medium text-slate-700">CTA (optional)
                <input className={inputClass} value={draft.cta} onChange={(event) => setDraft({ ...draft, cta: event.target.value })} />
              </label>
              <label className="text-sm font-medium text-slate-700">CTA link (optional)
                <div className="relative">
                  <Icon name="LinkIcon" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className={`${inputClass} pl-9`} value={draft.ctaHref} onChange={(event) => setDraft({ ...draft, ctaHref: event.target.value })} />
                </div>
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fdecea] text-secondary">
                  <Icon name="Squares2X2Icon" size={18} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Service Categories</h2>
                  <p className="text-xs text-slate-500">Add, edit and manage the service categories that appear in this section.</p>
                </div>
              </div>
              <button type="button" onClick={addCategory} className="inline-flex h-10 items-center gap-1 rounded-full bg-secondary px-4 text-sm font-semibold text-white">
                <Icon name="PlusIcon" size={14} /> Add Category
              </button>
            </div>

            <div className="space-y-3">
              {draft.categories.map((category, index) => {
                const open = openId === category.id;
                return (
                  <article key={category.id} className="overflow-hidden rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-3 px-3 py-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">{index + 1}</span>
                      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${category.bgClass || 'bg-primary/10'}`}>
                        <Icon name={category.icon || 'CubeIcon'} size={18} className={category.iconClass || 'text-primary'} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900">{category.name || 'Untitled'}</p>
                        <p className="text-xs text-slate-500">{category.offerings || 0} offerings</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${category.published ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {category.published ? 'Published' : 'Hidden'}
                      </span>
                      <button type="button" className="text-sm font-semibold text-slate-500 hover:text-secondary" onClick={() => duplicateCategory(category.id)}>Duplicate</button>
                      <button type="button" className="text-sm font-semibold text-rose-500" onClick={() => removeCategory(category.id)}>Remove</button>
                      <button type="button" className="rounded-lg p-1 text-slate-400" onClick={() => setOpenId(open ? '' : category.id)} aria-label="Toggle category">
                        <Icon name="ChevronDownIcon" size={16} className={`transition ${open ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                    {open ? (
                      <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <label className="text-sm font-medium">Category ID
                            <input className={inputClass} value={category.id} onChange={(event) => updateCategory(category.id, { id: event.target.value })} />
                          </label>
                          <label className="text-sm font-medium">Category name
                            <input className={inputClass} value={category.name} onChange={(event) => updateCategory(category.id, { name: event.target.value })} />
                          </label>
                          <label className="text-sm font-medium">Number of offerings
                            <input className={inputClass} value={category.offerings} onChange={(event) => updateCategory(category.id, { offerings: event.target.value })} />
                          </label>
                          <label className="text-sm font-medium sm:col-span-1">Description
                            <textarea className={areaClass} rows={2} value={category.description} onChange={(event) => updateCategory(category.id, { description: event.target.value })} />
                          </label>
                          <label className="text-sm font-medium">Link (URL)
                            <input className={inputClass} value={category.href} onChange={(event) => updateCategory(category.id, { href: event.target.value })} />
                          </label>
                          <label className="text-sm font-medium">Icon name
                            <input className={inputClass} value={category.icon} onChange={(event) => updateCategory(category.id, { icon: event.target.value })} />
                          </label>
                          <label className="text-sm font-medium">Icon CSS class
                            <input className={inputClass} value={category.iconClass} onChange={(event) => updateCategory(category.id, { iconClass: event.target.value })} />
                          </label>
                          <label className="text-sm font-medium">Background CSS class
                            <input className={inputClass} value={category.bgClass} onChange={(event) => updateCategory(category.id, { bgClass: event.target.value })} />
                          </label>
                          <label className="flex items-center justify-between text-sm font-medium sm:col-span-3">
                            Published
                            <button
                              type="button"
                              role="switch"
                              aria-checked={category.published}
                              onClick={() => updateCategory(category.id, { published: !category.published })}
                              className={`relative h-6 w-11 rounded-full ${category.published ? 'bg-secondary' : 'bg-slate-200'}`}
                            >
                              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${category.published ? 'left-5' : 'left-0.5'}`} />
                            </button>
                          </label>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button type="button" className="text-xs font-semibold text-slate-500" onClick={() => moveCategory(index, -1)}>Move up</button>
                          <button type="button" className="text-xs font-semibold text-slate-500" onClick={() => moveCategory(index, 1)}>Move down</button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
