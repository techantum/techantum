'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminField, { adminInputClass } from '@/components/admin/AdminField';
import AdminFormGrid from '@/components/admin/AdminFormGrid';
import AdminButton from '@/components/admin/AdminButton';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminStatCard from '@/components/admin/AdminStatCard';
import AdminBadge from '@/components/admin/AdminBadge';
import CommunicationAccordion from '@/components/admin/ops/CommunicationAccordion';
import {
  OpsBackLink,
  OpsGrid,
  OpsGridSpan,
  OpsLinkedItem,
  OpsOverviewField,
  OpsPageShell,
} from '@/components/admin/ops/OpsUi';
import { PROJECT_STATUS_LABELS, TICKET_STATUS_LABELS, isClosedStatus } from '@/lib/ops/config';
import type { OpsClient, OpsCommunication, OpsProject, OpsTicket } from '@/lib/ops/types';

export default function OpsClientDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const [detail, setDetail] = useState<{
    client: OpsClient;
    projects: OpsProject[];
    tickets: OpsTicket[];
    communications: OpsCommunication[];
  } | null>(null);
  const [form, setForm] = useState({
    name: '',
    location: '',
    contact_number: '',
    whatsapp_number: '',
    email: '',
    website_domain: '',
    hosting_provider: '',
  });
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

  useEffect(() => {
    load();
  }, [id]);

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

  if (!detail) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">{error || 'Loading…'}</p>
      </div>
    );
  }

  const openTickets = detail.tickets.filter((t) => !isClosedStatus(t.status));
  const closedTickets = detail.tickets.filter((t) => isClosedStatus(t.status));

  return (
    <OpsPageShell>
      <AdminPageHeader
        title={detail.client.name}
        description={detail.client.client_code}
        action={<OpsBackLink href="/admin/ops/clients" label="All clients" />}
      />
      {message && <AdminAlert>{message}</AdminAlert>}
      {error && <AdminAlert variant="error">{error}</AdminAlert>}

      <AdminSection title="Client overview" accent="indigo">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <AdminStatCard label="Projects" value={detail.projects.length} icon="FolderIcon" accent="blue" />
          <AdminStatCard label="Open tickets" value={openTickets.length} icon="TicketIcon" />
          <AdminStatCard label="Completed" value={closedTickets.length} icon="CheckCircleIcon" accent="green" />
          <AdminStatCard label="Messages" value={detail.communications.length} icon="ChatBubbleLeftRightIcon" accent="violet" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <OpsOverviewField label="WhatsApp">{detail.client.whatsapp_number || '—'}</OpsOverviewField>
          <OpsOverviewField label="Email">{detail.client.email || '—'}</OpsOverviewField>
          <OpsOverviewField label="Location">{detail.client.location || '—'}</OpsOverviewField>
        </div>
      </AdminSection>

      <AdminSection title="Client information">
        <AdminFormGrid cols={2}>
          <AdminField label="Name *">
            <input className={adminInputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </AdminField>
          <AdminField label="Location">
            <input className={adminInputClass} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </AdminField>
          <AdminField label="Contact">
            <input className={adminInputClass} value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} />
          </AdminField>
          <AdminField label="WhatsApp">
            <input className={adminInputClass} value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} />
          </AdminField>
          <AdminField label="Email">
            <input className={adminInputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </AdminField>
          <AdminField label="Website domain">
            <input className={adminInputClass} value={form.website_domain} onChange={(e) => setForm({ ...form, website_domain: e.target.value })} />
          </AdminField>
          <AdminField label="Hosting provider">
            <input className={adminInputClass} value={form.hosting_provider} onChange={(e) => setForm({ ...form, hosting_provider: e.target.value })} />
          </AdminField>
        </AdminFormGrid>
        <AdminButton variant="primary" disabled={saving} onClick={save} className="mt-3">
          {saving ? 'Saving…' : 'Save client'}
        </AdminButton>
      </AdminSection>

      <OpsGrid>
        <AdminSection title="Projects" description={`${detail.projects.length} total`}>
          {detail.projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects yet.</p>
          ) : (
            <div>
              {detail.projects.map((p) => (
                <OpsLinkedItem
                  key={p.id}
                  href={`/admin/ops/projects/${p.id}`}
                  code={p.project_code}
                  title={p.project_name}
                  badge={<AdminBadge>{PROJECT_STATUS_LABELS[p.status] || p.status}</AdminBadge>}
                />
              ))}
            </div>
          )}
        </AdminSection>

        <AdminSection title="Active tickets" description={`${openTickets.length} open`}>
          {openTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">None.</p>
          ) : (
            <div>
              {openTickets.map((t) => (
                <OpsLinkedItem
                  key={t.id}
                  href={`/admin/ops/tickets/${t.id}`}
                  code={t.ticket_code}
                  title={t.title}
                  badge={<AdminBadge>{TICKET_STATUS_LABELS[t.status] || t.status}</AdminBadge>}
                />
              ))}
            </div>
          )}
        </AdminSection>

        <AdminSection title="Completed tickets" description={`${closedTickets.length} closed`}>
          {closedTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">None.</p>
          ) : (
            <div>
              {closedTickets.map((t) => (
                <OpsLinkedItem key={t.id} href={`/admin/ops/tickets/${t.id}`} code={t.ticket_code} title={t.title} />
              ))}
            </div>
          )}
        </AdminSection>

        <OpsGridSpan>
          <AdminSection title="Communication history" description={`${detail.communications.length} message(s)`} accent="indigo">
            <CommunicationAccordion items={detail.communications} emptyMessage="No messages for this client yet." />
          </AdminSection>
        </OpsGridSpan>
      </OpsGrid>
    </OpsPageShell>
  );
}
