'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import { PROJECT_TYPES, type RequirementTemplate } from '@/lib/client-requirements/types';

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function RequirementFormsPage() {
  const [templates, setTemplates] = useState<RequirementTemplate[]>([]);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    project_type: 'CMS Website',
    package_name: '',
    description: '',
    welcome_message: '',
    is_active: true,
  });
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    fetch('/api/admin/requirement-templates')
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          setMessage(body.error || 'Failed to load templates.');
          return null;
        }
        return r.json();
      })
      .then((data) => Array.isArray(data) && setTemplates(data));
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = { ...form, slug: form.slug || slugify(form.name) };
    const res = await fetch('/api/admin/requirement-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    setMessage(res.ok ? 'Template saved.' : body.error || 'Save failed');
    if (res.ok) {
      setForm({ name: '', slug: '', project_type: 'CMS Website', package_name: '', description: '', welcome_message: '', is_active: true });
      load();
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <AdminPageHeader title="Requirement Forms" description="Manage reusable form templates for future clients and project types." />
      {message && <p className="text-sm bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-lg">{message}</p>}
      <AdminSection title="Create Template" description="Sections and questions are stored dynamically in the database. The seeded CMS template includes the full 12-section questionnaire.">
        <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-sm font-medium">Template Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" /></label>
          <label className="text-sm font-medium">Slug<input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" /></label>
          <label className="text-sm font-medium">Project Type<select value={form.project_type} onChange={(e) => setForm({ ...form, project_type: e.target.value })} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">{PROJECT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label className="text-sm font-medium">Package<input value={form.package_name} onChange={(e) => setForm({ ...form, package_name: e.target.value })} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" /></label>
          <label className="md:col-span-2 text-sm font-medium">Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" /></label>
          <label className="md:col-span-2 text-sm font-medium">Welcome Message<textarea value={form.welcome_message} onChange={(e) => setForm({ ...form, welcome_message: e.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
          <div className="md:col-span-2"><button className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold">Save Template</button></div>
        </form>
      </AdminSection>
      <AdminSection title="Available Templates" description={`${templates.length} template(s)`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map((template) => (
            <div key={template.id} className="rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{template.name}</p>
                  <p className="text-xs text-muted-foreground">{template.project_type} {template.package_name ? `- ${template.package_name}` : ''}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${template.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>{template.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-3">{template.requirement_sections?.length ?? 0} sections</p>
            </div>
          ))}
        </div>
      </AdminSection>
    </div>
  );
}
