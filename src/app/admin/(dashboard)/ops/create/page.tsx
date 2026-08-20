'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminField, { adminInputClass, adminSelectClass, adminTextareaClass } from '@/components/admin/AdminField';
import AdminFormGrid from '@/components/admin/AdminFormGrid';
import AdminButton from '@/components/admin/AdminButton';
import AdminAlert from '@/components/admin/AdminAlert';
import { OpsGrid, OpsOverviewField, OpsPageShell } from '@/components/admin/ops/OpsUi';
import { ScheduleSummary, ScopeFields, WhatsAppModal } from '@/components/admin/ops/OpsShared';
import { estimateEndDate, todayISO } from '@/lib/ops/working-days';
import { TICKET_TYPE_LABELS } from '@/lib/ops/config';
import type { OpsClient, OpsProject } from '@/lib/ops/types';

type Mode = 'new' | 'existing';

const emptyNew = {
  client_name: '',
  location: '',
  contact_number: '',
  whatsapp_number: '',
  email: '',
  project_type: 'Website',
  package_name: '',
  website_domain: '',
  hosting_provider: '',
  scope_document_url: '',
  scope_url: '',
  estimated_hours: '40',
  cost_per_hour: '300',
  developers_count: '1',
  start_date: todayISO(),
};

export default function OpsCreatePage() {
  const [mode, setMode] = useState<Mode>('new');
  const [config, setConfig] = useState<{ projectTypes: string[]; packagesByType: Record<string, string[]>; today: string } | null>(null);
  const [form, setForm] = useState(emptyNew);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [duplicates, setDuplicates] = useState<OpsClient[]>([]);
  const [created, setCreated] = useState<{ client: OpsClient; project: OpsProject } | null>(null);
  const [waOpen, setWaOpen] = useState(false);
  const [waMessage, setWaMessage] = useState('');
  const [waError, setWaError] = useState('');
  const [waWarning, setWaWarning] = useState('');
  const [sending, setSending] = useState(false);

  const [clients, setClients] = useState<OpsClient[]>([]);
  const [clientQuery, setClientQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<OpsClient | null>(null);
  const [clientProjects, setClientProjects] = useState<OpsProject[]>([]);
  const [ticketForm, setTicketForm] = useState({
    project_id: '',
    ticket_type: 'FEATURE',
    title: '',
    description: '',
    scope_document_url: '',
    scope_url: '',
    estimated_hours: '8',
    cost_per_hour: '300',
    developers_count: '1',
    start_date: todayISO(),
  });

  useEffect(() => {
    fetch('/api/admin/ops/config')
      .then((r) => r.json())
      .then((data) => {
        setConfig(data);
        const firstType = data.projectTypes?.[0] || 'Website';
        const pkg = data.packagesByType?.[firstType]?.[0] || '';
        setForm((prev) => ({ ...prev, project_type: firstType, package_name: pkg, start_date: data.today || prev.start_date }));
      });
    fetch('/api/admin/ops/clients').then((r) => r.json()).then((rows) => Array.isArray(rows) && setClients(rows));
  }, []);

  const packages = config?.packagesByType?.[form.project_type] ?? [];
  const minDate = config?.today || todayISO();

  const newEndDate = useMemo(() => {
    try {
      return estimateEndDate(form.start_date, Number(form.estimated_hours), Number(form.developers_count));
    } catch {
      return '';
    }
  }, [form.start_date, form.estimated_hours, form.developers_count]);

  const ticketEndDate = useMemo(() => {
    try {
      return estimateEndDate(ticketForm.start_date, Number(ticketForm.estimated_hours), Number(ticketForm.developers_count));
    } catch {
      return '';
    }
  }, [ticketForm.start_date, ticketForm.estimated_hours, ticketForm.developers_count]);

  const filteredClients = clients.filter((c) => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return true;
    return [c.name, c.email, c.contact_number, c.whatsapp_number, c.client_code].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
  });

  const selectClient = async (client: OpsClient) => {
    setSelectedClient(client);
    const res = await fetch(`/api/admin/ops/clients/${client.id}`);
    const body = await res.json();
    setClientProjects(body.projects ?? []);
    setTicketForm((prev) => ({ ...prev, project_id: body.projects?.[0]?.id || '' }));
  };

  const createProject = async (confirmDuplicate = false) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/ops/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, confirmDuplicate }),
      });
      const body = await res.json();
      if (res.status === 409) {
        setDuplicates(body.duplicates || []);
        throw new Error(body.error);
      }
      if (!res.ok) throw new Error(body.error || 'Create failed');
      setCreated({ client: body.client, project: body.project });
      setMessage('Project created successfully.');
      setDuplicates([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const createTicket = async () => {
    if (!selectedClient) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/ops/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ticketForm, client_id: selectedClient.id }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Create failed');
      setMessage(`Ticket ${body.ticket_code} created.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const openWelcome = async () => {
    if (!created) return;
    setWaError('');
    const res = await fetch(`/api/admin/ops/projects/${created.project.id}/whatsapp/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'welcome' }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error || 'Preview failed');
      return;
    }
    setWaMessage(body.message);
    setWaWarning(body.delivery?.warning || '');
    setWaOpen(true);
  };

  const sendWelcome = async () => {
    if (!created) return;
    setSending(true);
    setWaError('');
    try {
      const res = await fetch(`/api/admin/ops/projects/${created.project.id}/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'welcome', message: waMessage }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Send failed');
      setWaOpen(false);
      setMessage('WhatsApp template accepted. Check the chat from your business number, not a Meta test number.');
    } catch (err) {
      setWaError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <OpsPageShell>
      <AdminPageHeader title="Create Ticket" description="Onboard a new project or add a ticket to an existing client project." />
      {message && <AdminAlert>{message}</AdminAlert>}
      {error && <AdminAlert variant="error">{error}</AdminAlert>}

      <AdminSection title="What would you like to create?">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {(['new', 'existing'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                mode === item ? 'border-indigo-500 bg-indigo-50' : 'border-border bg-white hover:border-indigo-200'
              }`}
            >
              <p className="text-sm font-semibold">{item === 'new' ? 'New Project' : 'Existing Project Ticket'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {item === 'new'
                  ? 'Onboard a client and create a delivery project.'
                  : 'Log a feature, enhancement, or bug against an existing project.'}
              </p>
            </button>
          ))}
        </div>
      </AdminSection>

      {mode === 'new' && !created && (
        <>
          <OpsGrid>
            <AdminSection title="Client information">
              <AdminFormGrid cols={1}>
                <AdminField label="Client name *">
                  <input className={adminInputClass} value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
                </AdminField>
                <AdminField label="Location">
                  <input className={adminInputClass} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </AdminField>
                <AdminField label="Contact number">
                  <input className={adminInputClass} value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} />
                </AdminField>
                <AdminField label="WhatsApp number" hint="Stored as +91…">
                  <input className={adminInputClass} value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} placeholder="+919876543210" />
                </AdminField>
                <AdminField label="Email">
                  <input type="email" className={adminInputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </AdminField>
              </AdminFormGrid>
            </AdminSection>

            <AdminSection title="Project information">
              <AdminFormGrid cols={1}>
                <AdminField label="Type of project *">
                  <select
                    className={adminSelectClass}
                    value={form.project_type}
                    onChange={(e) => {
                      const project_type = e.target.value;
                      setForm({ ...form, project_type, package_name: config?.packagesByType?.[project_type]?.[0] || '' });
                    }}
                  >
                    {(config?.projectTypes ?? []).map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </AdminField>
                <AdminField label="Package *">
                  <select className={adminSelectClass} value={form.package_name} onChange={(e) => setForm({ ...form, package_name: e.target.value })}>
                    {packages.map((pkg) => (
                      <option key={pkg}>{pkg}</option>
                    ))}
                  </select>
                </AdminField>
                <AdminField label="Website domain">
                  <input className={adminInputClass} value={form.website_domain} onChange={(e) => setForm({ ...form, website_domain: e.target.value })} placeholder="example.com" />
                </AdminField>
                <AdminField label="Hosting provider">
                  <input className={adminInputClass} value={form.hosting_provider} onChange={(e) => setForm({ ...form, hosting_provider: e.target.value })} placeholder="Hostinger, AWS, Client Hosting…" />
                </AdminField>
              </AdminFormGrid>
              <ScopeFields
                documentUrl={form.scope_document_url}
                url={form.scope_url}
                onDocumentUrl={(scope_document_url) => setForm({ ...form, scope_document_url })}
                onUrl={(scope_url) => setForm({ ...form, scope_url })}
              />
            </AdminSection>
          </OpsGrid>

          <AdminSection title="Internal information" description="Never sent to the client on WhatsApp." accent="amber">
            <AdminFormGrid cols={3}>
              <AdminField label="Estimated hours *">
                <input type="number" min="0.5" step="0.5" className={adminInputClass} value={form.estimated_hours} onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })} />
              </AdminField>
              <AdminField label="Cost per hour (INR) *">
                <input type="number" min="0" className={adminInputClass} value={form.cost_per_hour} onChange={(e) => setForm({ ...form, cost_per_hour: e.target.value })} />
              </AdminField>
              <AdminField label="Developers *">
                <input type="number" min="1" className={adminInputClass} value={form.developers_count} onChange={(e) => setForm({ ...form, developers_count: e.target.value })} />
              </AdminField>
              <AdminField label="Start date *">
                <input type="date" min={minDate} className={adminInputClass} value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </AdminField>
              <AdminField label="Estimated end date">
                <input className={adminInputClass} value={newEndDate} readOnly />
              </AdminField>
            </AdminFormGrid>
            <ScheduleSummary hours={Number(form.estimated_hours) || 0} developers={Number(form.developers_count) || 1} startDate={form.start_date} endDate={newEndDate} />
          </AdminSection>

          {duplicates.length > 0 && (
            <AdminAlert variant="info">
              A client with similar information already exists:{' '}
              {duplicates.map((d) => `${d.name} (${d.client_code})`).join(', ')}. Review them, or confirm to create anyway.
            </AdminAlert>
          )}

          <div className="flex gap-2">
            <AdminButton variant="primary" disabled={saving} onClick={() => createProject(false)}>
              {saving ? 'Saving…' : 'Create project'}
            </AdminButton>
            {duplicates.length > 0 && (
              <AdminButton disabled={saving} onClick={() => createProject(true)}>
                Create anyway
              </AdminButton>
            )}
          </div>
        </>
      )}

      {created && (
        <AdminSection title="Send welcome message" accent="emerald">
          <p className="text-sm mb-2">
            Project <strong>{created.project.project_code}</strong> is ready. Preview the WhatsApp welcome message before sending.
          </p>
          <div className="flex gap-2">
            <AdminButton variant="primary" onClick={openWelcome}>
              Preview message
            </AdminButton>
            <Link href={`/admin/ops/projects/${created.project.id}`} className="text-sm text-indigo-600 self-center">
              Open project
            </Link>
          </div>
        </AdminSection>
      )}

      {mode === 'existing' && (
        <>
          <AdminSection title="Select client">
            <input
              className={`${adminInputClass} mb-2 max-w-md`}
              placeholder="Search name, phone, WhatsApp, email…"
              value={clientQuery}
              onChange={(e) => setClientQuery(e.target.value)}
            />
            <div className="max-h-40 overflow-auto rounded-lg border divide-y">
              {filteredClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => selectClient(client)}
                  className={`w-full text-left px-3 py-2 text-sm ${selectedClient?.id === client.id ? 'bg-indigo-50' : 'hover:bg-muted/40'}`}
                >
                  <span className="font-medium">{client.name}</span>{' '}
                  <span className="text-muted-foreground text-xs">
                    {client.client_code} · {client.email || client.whatsapp_number || ''}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs mt-2">
              <Link href="/admin/ops/clients" className="text-indigo-600">
                + Add new client
              </Link>{' '}
              if they are not listed.
            </p>
          </AdminSection>

          {selectedClient && (
            <>
              <AdminSection title="Client snapshot" description="Read-only. Edit from client page.">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <OpsOverviewField label="Name">{selectedClient.name}</OpsOverviewField>
                  <OpsOverviewField label="Location">{selectedClient.location || '—'}</OpsOverviewField>
                  <OpsOverviewField label="WhatsApp">{selectedClient.whatsapp_number || '—'}</OpsOverviewField>
                  <OpsOverviewField label="Email">{selectedClient.email || '—'}</OpsOverviewField>
                  <OpsOverviewField label="Domain">{selectedClient.website_domain || '—'}</OpsOverviewField>
                  <OpsOverviewField label="Hosting">{selectedClient.hosting_provider || '—'}</OpsOverviewField>
                </div>
                <Link href={`/admin/ops/clients/${selectedClient.id}`} className="text-xs text-indigo-600 mt-2 inline-block">
                  Edit client
                </Link>
              </AdminSection>

              <OpsGrid>
                <AdminSection title="Ticket details">
                  <AdminFormGrid cols={1}>
                    <AdminField label="Select project *">
                      <select className={adminSelectClass} value={ticketForm.project_id} onChange={(e) => setTicketForm({ ...ticketForm, project_id: e.target.value })}>
                        <option value="">Choose project</option>
                        {clientProjects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.project_name} ({p.project_code})
                          </option>
                        ))}
                      </select>
                    </AdminField>
                    <AdminField label="Ticket type *">
                      <select className={adminSelectClass} value={ticketForm.ticket_type} onChange={(e) => setTicketForm({ ...ticketForm, ticket_type: e.target.value })}>
                        {Object.entries(TICKET_TYPE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </AdminField>
                    <AdminField label="Ticket title *">
                      <input className={adminInputClass} value={ticketForm.title} onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })} placeholder="Add OTP Login" />
                    </AdminField>
                    <AdminField label="Description / requirement">
                      <textarea className={adminTextareaClass} rows={3} value={ticketForm.description} onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })} />
                    </AdminField>
                  </AdminFormGrid>
                  <ScopeFields
                    documentUrl={ticketForm.scope_document_url}
                    url={ticketForm.scope_url}
                    onDocumentUrl={(scope_document_url) => setTicketForm({ ...ticketForm, scope_document_url })}
                    onUrl={(scope_url) => setTicketForm({ ...ticketForm, scope_url })}
                  />
                </AdminSection>

                <AdminSection title="Internal estimation" accent="amber">
                  <AdminFormGrid cols={1}>
                    <AdminField label="Estimated hours *">
                      <input type="number" min="0.5" step="0.5" className={adminInputClass} value={ticketForm.estimated_hours} onChange={(e) => setTicketForm({ ...ticketForm, estimated_hours: e.target.value })} />
                    </AdminField>
                    <AdminField label="Cost per hour (INR) *">
                      <input type="number" min="0" className={adminInputClass} value={ticketForm.cost_per_hour} onChange={(e) => setTicketForm({ ...ticketForm, cost_per_hour: e.target.value })} />
                    </AdminField>
                    <AdminField label="Developers *">
                      <input type="number" min="1" className={adminInputClass} value={ticketForm.developers_count} onChange={(e) => setTicketForm({ ...ticketForm, developers_count: e.target.value })} />
                    </AdminField>
                    <AdminField label="Start date *">
                      <input type="date" min={minDate} className={adminInputClass} value={ticketForm.start_date} onChange={(e) => setTicketForm({ ...ticketForm, start_date: e.target.value })} />
                    </AdminField>
                    <AdminField label="Estimated end date">
                      <input className={adminInputClass} value={ticketEndDate} readOnly />
                    </AdminField>
                  </AdminFormGrid>
                  <ScheduleSummary
                    hours={Number(ticketForm.estimated_hours) || 0}
                    developers={Number(ticketForm.developers_count) || 1}
                    startDate={ticketForm.start_date}
                    endDate={ticketEndDate}
                  />
                </AdminSection>
              </OpsGrid>

              <AdminButton variant="primary" disabled={saving} onClick={createTicket}>
                {saving ? 'Saving…' : 'Create ticket'}
              </AdminButton>
            </>
          )}
        </>
      )}

      <WhatsAppModal
        open={waOpen}
        title="Send Welcome Message"
        clientName={created?.client.name || ''}
        whatsapp={created?.client.whatsapp_number || null}
        message={waMessage}
        onMessage={setWaMessage}
        onClose={() => setWaOpen(false)}
        onSend={sendWelcome}
        sending={sending}
        error={waError}
        warning={waWarning}
      />
    </OpsPageShell>
  );
}
