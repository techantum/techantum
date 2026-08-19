'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminField, { adminInputClass } from '@/components/admin/AdminField';
import AdminFormGrid from '@/components/admin/AdminFormGrid';
import AdminButton from '@/components/admin/AdminButton';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminBadge from '@/components/admin/AdminBadge';
import { PROJECT_STATUS_LABELS, TICKET_STATUS_LABELS, isClosedStatus } from '@/lib/ops/config';
import type { OpsClient, OpsCommunication, OpsProject, OpsTicket } from '@/lib/ops/types';

export default function OpsClientDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const [detail, setDetail] = useState<{ client: OpsClient; projects: OpsProject[]; tickets: OpsTicket[]; communications: OpsCommunication[] } | null>(null);
  const [form, setForm] = useState({ name: '', location: '', contact_number: '', whatsapp_number: '', email: '', website_domain: '', hosting_provider: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch(`/api/admin/ops/clients/${id}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Not found');
        setDetail(body);
        const c = body.client as OpsClient;
        setForm({
          name: c.name,
          location: c.location || '',
          contact_number: c.contact_number || '',
          whatsapp_number: c.whatsapp_number || '',
          email: c.email || '',
          website_domain: c.website_domain || '',
          hosting_provider: c.hosting_provider || '',
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  };

  useEffect(() => { load(); }, [id]);

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`/api/admin/ops/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Save failed');
      setMessage('Client updated.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!detail) return <p className="text-sm text-muted-foreground">{error || 'Loading…'}</p>;
  const openTickets = detail.tickets.filter((t) => !isClosedStatus(t.status));
  const closedTickets = detail.tickets.filter((t) => isClosedStatus(t.status));

  return (
    <div className="space-y-6 max-w-5xl">
      <AdminPageHeader title={detail.client.name} description={detail.client.client_code} />
      {message && <AdminAlert>{message}</AdminAlert>}
      {error && <AdminAlert variant="error">{error}</AdminAlert>}

      <AdminSection title="Client information">
        <AdminFormGrid cols={2}>
          <AdminField label="Name *"><input className={adminInputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></AdminField>
          <AdminField label="Location"><input className={adminInputClass} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></AdminField>
          <AdminField label="Contact"><input className={adminInputClass} value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} /></AdminField>
          <AdminField label="WhatsApp"><input className={adminInputClass} value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} /></AdminField>
          <AdminField label="Email"><input className={adminInputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></AdminField>
          <AdminField label="Website domain"><input className={adminInputClass} value={form.website_domain} onChange={(e) => setForm({ ...form, website_domain: e.target.value })} /></AdminField>
          <AdminField label="Hosting provider"><input className={adminInputClass} value={form.hosting_provider} onChange={(e) => setForm({ ...form, hosting_provider: e.target.value })} /></AdminField>
        </AdminFormGrid>
        <AdminButton variant="primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save client'}</AdminButton>
      </AdminSection>

      <AdminSection title="Projects">
        {detail.projects.length === 0 ? <p className="text-sm text-muted-foreground">No projects yet.</p> : (
          <ul className="space-y-2 text-sm">
            {detail.projects.map((p) => (
              <li key={p.id} className="flex justify-between gap-3">
                <Link className="text-indigo-600 hover:underline" href={`/admin/ops/projects/${p.id}`}>{p.project_code} · {p.project_name}</Link>
                <AdminBadge>{PROJECT_STATUS_LABELS[p.status] || p.status}</AdminBadge>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>

      <AdminSection title="Active tickets">
        {openTickets.length === 0 ? <p className="text-sm text-muted-foreground">None.</p> : openTickets.map((t) => (
          <p key={t.id} className="text-sm"><Link className="text-indigo-600 hover:underline" href={`/admin/ops/tickets/${t.id}`}>{t.ticket_code} · {t.title}</Link> <AdminBadge>{TICKET_STATUS_LABELS[t.status] || t.status}</AdminBadge></p>
        ))}
      </AdminSection>
      <AdminSection title="Completed tickets">
        {closedTickets.length === 0 ? <p className="text-sm text-muted-foreground">None.</p> : closedTickets.map((t) => (
          <p key={t.id} className="text-sm"><Link className="text-indigo-600 hover:underline" href={`/admin/ops/tickets/${t.id}`}>{t.ticket_code} · {t.title}</Link></p>
        ))}
      </AdminSection>
      <AdminSection title="Communication history">
        {detail.communications.length === 0 ? <p className="text-sm text-muted-foreground">No messages yet.</p> : (
          <div className="space-y-3 text-sm">
            {detail.communications.map((c) => (
              <div key={c.id} className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">{c.created_at} · {c.channel} · {c.status} · {c.recipient}</p>
                <pre className="whitespace-pre-wrap font-sans mt-2">{c.message_body}</pre>
                {c.provider_message_id && <p className="text-xs text-muted-foreground mt-1">ID: {c.provider_message_id}</p>}
              </div>
            ))}
          </div>
        )}
      </AdminSection>
    </div>
  );
}
