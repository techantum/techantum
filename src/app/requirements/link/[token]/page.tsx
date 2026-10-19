'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const field = 'w-full rounded-xl border border-slate-200 px-3 py-3 text-base';

export default function PublicRequirementLinkPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token || '';
  const [form, setForm] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`/api/requirements/link/${token}`).then(async (res) => {
      const body = await res.json();
      if (!res.ok) setError(body.error || 'This link is not available');
      else setForm(body);
      setReady(true);
    });
  }, [token]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const res = await fetch(`/api/requirements/link/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const body = await res.json();
    if (!res.ok) { setError(body.error || 'Could not send your details'); return; }
    setDone(true);
  };

  if (!ready) return <div className="mx-auto max-w-xl px-4 py-16 text-slate-500">Loading…</div>;
  if (done) return <div className="mx-auto max-w-xl px-4 py-16"><h1 className="text-2xl font-semibold">Thank you</h1><p className="mt-2 text-slate-600">We have your project details. Techantum will use them to set up the project and share the timeline with you.</p></div>;

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">Tell us about your project</h1>
      <p className="text-slate-600">A short form is enough. We use this to set up your project.</p>
      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      <label className="block text-sm">Your name<input required className={field} value={form.client_name || ''} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></label>
      <label className="block text-sm">Company<input className={field} value={form.company_name || ''} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></label>
      <label className="block text-sm">Email<input type="email" className={field} value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
      <label className="block text-sm">WhatsApp number<input required className={field} value={form.whatsapp_number || ''} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} /></label>
      <label className="block text-sm">Project name<input className={field} value={form.project_name || ''} onChange={(e) => setForm({ ...form, project_name: e.target.value })} /></label>
      <label className="block text-sm">What should we build?<textarea required rows={5} className={field} value={form.brief || ''} onChange={(e) => setForm({ ...form, brief: e.target.value })} /></label>
      <label className="block text-sm">Preferred start<input type="date" className={field} value={form.preferred_start || ''} onChange={(e) => setForm({ ...form, preferred_start: e.target.value })} /></label>
      <label className="block text-sm">Websites you like<textarea rows={3} className={field} value={form.references_text || ''} onChange={(e) => setForm({ ...form, references_text: e.target.value })} /></label>
      <button className="rounded-full bg-secondary px-5 py-2.5 font-semibold text-white" type="submit">Send details</button>
    </form>
  );
}
