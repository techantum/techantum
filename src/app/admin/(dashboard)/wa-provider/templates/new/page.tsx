'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import AdminField, { adminInputClass, adminSelectClass, adminTextareaClass } from '@/components/admin/AdminField';
import AdminAlert from '@/components/admin/AdminAlert';
import { ProviderShell } from '@/components/admin/wa-provider/ProviderUi';

type ButtonRow = { type: string; text: string; url?: string; phone_number?: string };

export default function TemplateBuilderPage() {
  const router = useRouter();
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    clientId: '',
    name: '',
    category: 'UTILITY',
    language: 'en',
    headerType: 'NONE',
    headerContent: '',
    body: 'Hello {{1}}, your appointment is confirmed for {{2}}.',
    footer: '',
    examples: { '1': 'Rahul', '2': '24 Sep 10:30 AM' } as Record<string, string>,
    buttons: [] as ButtonRow[],
  });

  useEffect(() => {
    fetch('/api/admin/wa-provider/clients').then((r) => r.json()).then((b) => setClients(b.rows || []));
  }, []);

  const variables = useMemo(() => [...(form.body.match(/\{\{(\d+)\}\}/g) || [])].map((m) => m.replace(/[{}]/g, '')), [form.body]);
  const preview = useMemo(() => {
    let text = form.body;
    for (const [key, value] of Object.entries(form.examples)) text = text.replaceAll(`{{${key}}}`, value || `{{${key}}}`);
    return text;
  }, [form.body, form.examples]);

  const save = async (draft: boolean) => {
    const res = await fetch('/api/admin/wa-provider/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, draft }),
    });
    const body = await res.json();
    if (!res.ok) return setError(body.error || 'Save failed');
    router.push('/admin/wa-provider/templates');
  };

  return (
    <ProviderShell>
      <AdminPageHeader title="Template builder" description="Create a WhatsApp template. Approve internally before submitting to Meta." />
      {error && <AdminAlert variant="error">{error}</AdminAlert>}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <AdminSection title="Template">
          <AdminField label="Client">
            <select className={adminSelectClass} value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}>
              <option value="">Select client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </AdminField>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <AdminField label="Name">
              <input className={adminInputClass} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="appointment_confirm" />
            </AdminField>
            <AdminField label="Category">
              <select className={adminSelectClass} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                <option>UTILITY</option>
                <option>MARKETING</option>
                <option>AUTHENTICATION</option>
              </select>
            </AdminField>
            <AdminField label="Language">
              <input className={adminInputClass} value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))} />
            </AdminField>
          </div>
          <AdminField label="Header">
            <select className={adminSelectClass} value={form.headerType} onChange={(e) => setForm((f) => ({ ...f, headerType: e.target.value }))}>
              <option value="NONE">None</option>
              <option value="TEXT">Text</option>
              <option value="IMAGE">Image</option>
              <option value="VIDEO">Video</option>
              <option value="DOCUMENT">Document</option>
              <option value="LOCATION">Location</option>
            </select>
          </AdminField>
          {form.headerType === 'TEXT' && (
            <AdminField label="Header text">
              <input className={adminInputClass} value={form.headerContent} onChange={(e) => setForm((f) => ({ ...f, headerContent: e.target.value }))} />
            </AdminField>
          )}
          <AdminField label="Body" hint="Use {{1}}, {{2}} for variables.">
            <textarea className={adminTextareaClass} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
          </AdminField>
          <AdminField label="Footer">
            <input className={adminInputClass} value={form.footer} onChange={(e) => setForm((f) => ({ ...f, footer: e.target.value }))} />
          </AdminField>
          {variables.map((variable) => (
            <AdminField key={variable} label={`Sample {{${variable}}}`}>
              <input className={adminInputClass} value={form.examples[variable] || ''} onChange={(e) => setForm((f) => ({ ...f, examples: { ...f.examples, [variable]: e.target.value } }))} />
            </AdminField>
          ))}
          <AdminButton
            onClick={() => setForm((f) => ({ ...f, buttons: [...f.buttons, { type: 'QUICK_REPLY', text: 'OK' }] }))}
          >
            Add button
          </AdminButton>
          {form.buttons.map((button, index) => (
            <div key={index} className="grid grid-cols-3 gap-2">
              <select className={adminSelectClass} value={button.type} onChange={(e) => setForm((f) => ({ ...f, buttons: f.buttons.map((b, i) => (i === index ? { ...b, type: e.target.value } : b)) }))}>
                <option>QUICK_REPLY</option>
                <option>URL</option>
                <option>PHONE_NUMBER</option>
                <option>OTP</option>
              </select>
              <input className={adminInputClass} value={button.text} onChange={(e) => setForm((f) => ({ ...f, buttons: f.buttons.map((b, i) => (i === index ? { ...b, text: e.target.value } : b)) }))} />
              {button.type === 'URL' && <input className={adminInputClass} placeholder="https://" value={button.url || ''} onChange={(e) => setForm((f) => ({ ...f, buttons: f.buttons.map((b, i) => (i === index ? { ...b, url: e.target.value } : b)) }))} />}
            </div>
          ))}
          <div className="flex gap-2">
            <AdminButton variant="secondary" onClick={() => save(true)}>
              Save draft
            </AdminButton>
            <AdminButton variant="primary" onClick={() => save(false)}>
              Save and validate
            </AdminButton>
          </div>
        </AdminSection>
        <AdminSection title="WhatsApp preview">
          <div className="mx-auto w-[280px] rounded-[28px] border border-slate-300 bg-[#efeae2] p-3 shadow-sm">
            <div className="rounded-lg bg-[#d9fdd3] p-3 text-sm text-slate-800 shadow">
              {form.headerType === 'TEXT' && <p className="font-semibold mb-1">{form.headerContent}</p>}
              <p className="whitespace-pre-wrap">{preview}</p>
              {form.footer && <p className="text-[11px] text-slate-500 mt-2">{form.footer}</p>}
              <div className="mt-2 space-y-1">
                {form.buttons.map((button, i) => (
                  <div key={i} className="rounded-md bg-white/80 text-center text-xs py-1 text-sky-700">
                    {button.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AdminSection>
      </div>
    </ProviderShell>
  );
}
