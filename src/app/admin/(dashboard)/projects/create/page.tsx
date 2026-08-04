'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import { PROJECT_PACKAGES, PROJECT_TYPES, type RequirementTemplate } from '@/lib/client-requirements/types';

const initialForm = {
  project_name: '',
  client_name: '',
  company_name: '',
  primary_contact_person: '',
  email: '',
  mobile_number: '',
  project_type: 'CMS Website',
  package_name: 'Launch Plan',
  status: 'draft',
  template_id: '',
  expiry_date: '',
  allow_multiple_submissions: false,
  allow_save_draft: true,
  optional_password: '',
};

export default function CreateProjectPage() {
  const [templates, setTemplates] = useState<RequirementTemplate[]>([]);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [createdUrl, setCreatedUrl] = useState('');
  const [message, setMessage] = useState('');
  const packages = PROJECT_PACKAGES[form.project_type] ?? [];
  const matchingTemplates = useMemo(
    () => templates.filter((template) => template.project_type === form.project_type),
    [templates, form.project_type]
  );

  useEffect(() => {
    fetch('/api/admin/requirement-templates')
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          setMessage(body.error || 'Failed to load requirement templates.');
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setTemplates(data);
          const first = data.find((template) => template.project_type === initialForm.project_type);
          if (first) setForm((prev) => ({ ...prev, template_id: first.id }));
        }
      });
  }, []);

  const setField = (key: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setCreatedUrl('');
    const res = await fetch('/api/admin/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, template_id: form.template_id || null, expiry_date: form.expiry_date || null }),
    });
    const body = await res.json();
    setSaving(false);
    if (res.ok) {
      setCreatedUrl(body.share_url || '');
      setMessage('Public link generated.');
    } else {
      setMessage(body.error || 'Project creation failed.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <AdminPageHeader title="Create Project" description="Generate a secure requirement collection link for a client." />
      <Link href="/admin/projects" className="text-sm text-muted-foreground hover:text-primary">Back to projects</Link>
      {message && (
        <p
          className={`text-sm border px-4 py-2 rounded-lg ${
            message.toLowerCase().includes('failed') || message.toLowerCase().includes('error')
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-green-50 text-green-700 border-green-200'
          }`}
        >
          {message}
        </p>
      )}
      {createdUrl && (
        <AdminSection title="Public Link" accent="emerald" description="Share this with the client. They can open it without login.">
          <div className="flex flex-col sm:flex-row gap-2">
            <input readOnly value={createdUrl} className="flex-1 rounded-lg border border-border px-3 py-2 text-sm" />
            <button type="button" onClick={() => navigator.clipboard.writeText(createdUrl)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">Copy Link</button>
          </div>
        </AdminSection>
      )}
      <AdminSection title="Project Details">
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            ['project_name', 'Project Name *'],
            ['client_name', 'Client Name *'],
            ['company_name', 'Company Name *'],
            ['primary_contact_person', 'Primary Contact Person'],
            ['email', 'Email *'],
            ['mobile_number', 'Mobile Number'],
          ].map(([key, label]) => (
            <label key={key} className="text-sm font-medium">
              {label}
              <input required={label.includes('*')} type={key === 'email' ? 'email' : 'text'} value={String(form[key as keyof typeof form])} onChange={(e) => setField(key as keyof typeof form, e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
            </label>
          ))}
          <label className="text-sm font-medium">
            Project Type
            <select value={form.project_type} onChange={(e) => setForm((prev) => ({ ...prev, project_type: e.target.value, package_name: PROJECT_PACKAGES[e.target.value]?.[0] || '', template_id: templates.find((t) => t.project_type === e.target.value)?.id || '' }))} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
              {PROJECT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">
            Package
            <select value={form.package_name} onChange={(e) => setField('package_name', e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
              {packages.map((pkg) => <option key={pkg} value={pkg}>{pkg}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">
            Status
            <select value={form.status} onChange={(e) => setField('status', e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
              <option value="draft">Draft (link hidden until activated)</option>
              <option value="active">Active (client can open link)</option>
              <option value="closed">Closed (link disabled)</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Requirement Form Template
            <select value={form.template_id} onChange={(e) => setField('template_id', e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
              <option value="">Select template</option>
              {matchingTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">
            Expiry Date
            <input type="date" value={form.expiry_date} onChange={(e) => setField('expiry_date', e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium">
            Optional Password
            <input value={form.optional_password} onChange={(e) => setField('optional_password', e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
          </label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allow_multiple_submissions} onChange={(e) => setField('allow_multiple_submissions', e.target.checked)} /> Allow multiple submissions</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allow_save_draft} onChange={(e) => setField('allow_save_draft', e.target.checked)} /> Allow save draft</label>
          <div className="md:col-span-2">
            <button disabled={saving} className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60">{saving ? 'Creating...' : 'Generate Public Link'}</button>
          </div>
        </form>
      </AdminSection>
    </div>
  );
}
