'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import AdminBadge from '@/components/admin/AdminBadge';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminStatCard from '@/components/admin/AdminStatCard';
import CommunicationAccordion from '@/components/admin/ops/CommunicationAccordion';
import {
  formatOpsWhen,
  InternalEstimationGrid,
  OpsBackLink,
  OpsGrid,
  OpsGridSpan,
  OpsLinkedItem,
  OpsOverviewField,
  OpsPageShell,
  OpsTimelineItem,
} from '@/components/admin/ops/OpsUi';
import { adminInputClass, adminSelectClass, adminTextareaClass } from '@/components/admin/AdminField';
import { WhatsAppModal } from '@/components/admin/ops/OpsShared';
import Icon from '@/components/ui/AppIcon';
import { PROJECT_STATUS_LABELS, TICKET_STATUS_LABELS, isClosedStatus } from '@/lib/ops/config';
import { internalCost, isOverdue, type OpsCommunication, type OpsDateExtension, type OpsProject, type OpsStatusHistory, type OpsTicket } from '@/lib/ops/types';
import { todayISO } from '@/lib/ops/working-days';

export default function OpsProjectDetailPage() {
  const id = String(useParams().id);
  const [detail, setDetail] = useState<{
    project: OpsProject;
    tickets: OpsTicket[];
    statusHistory: OpsStatusHistory[];
    extensions: OpsDateExtension[];
    communications: OpsCommunication[];
  } | null>(null);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [waOpen, setWaOpen] = useState(false);
  const [waMessage, setWaMessage] = useState('');
  const [waError, setWaError] = useState('');
  const [waWarning, setWaWarning] = useState('');
  const [sending, setSending] = useState(false);

  const load = () => {
    fetch(`/api/admin/ops/projects/${id}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Not found');
        setDetail(body);
        setStatus(body.project.status);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  };

  useEffect(() => {
    load();
  }, [id]);

  const patchStatus = async () => {
    setError('');
    const res = await fetch(`/api/admin/ops/projects/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note }),
    });
    const body = await res.json();
    if (!res.ok) return setError(body.error || 'Status update failed');
    setMessage('Status updated.');
    setNote('');
    load();
  };

  const extend = async () => {
    setError('');
    const res = await fetch(`/api/admin/ops/projects/${id}/extend-date`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_end_date: newDate, reason }),
    });
    const body = await res.json();
    if (!res.ok) return setError(body.error || 'Extension failed');
    setMessage('Delivery date extended.');
    setReason('');
    load();
  };

  const openUpdate = async () => {
    const res = await fetch(`/api/admin/ops/projects/${id}/whatsapp/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'update' }),
    });
    const body = await res.json();
    if (!res.ok) return setError(body.error || 'Preview failed');
    setWaMessage(body.message);
    setWaWarning(body.delivery?.warning || '');
    setWaOpen(true);
  };

  const sendUpdate = async () => {
    setSending(true);
    setWaError('');
    try {
      const res = await fetch(`/api/admin/ops/projects/${id}/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'update', message: waMessage }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Send failed');
      setWaOpen(false);
      setMessage('WhatsApp template accepted. Check the chat from your business number, not a Meta test number.');
      load();
    } catch (err) {
      setWaError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  if (!detail) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">{error || 'Loading…'}</p>
      </div>
    );
  }

  const p = detail.project;
  const overdue = isOverdue(p.current_end_date, p.status, todayISO());
  const cost = internalCost(Number(p.estimated_hours), Number(p.cost_per_hour));

  return (
    <OpsPageShell>
      <AdminPageHeader
        title={p.project_name}
        description={`${p.project_code} · ${p.ops_clients?.name || ''}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <OpsBackLink href="/admin/ops/projects" label="All projects" />
            <AdminButton variant="primary" onClick={openUpdate}>
              <Icon name="PaperAirplaneIcon" size={16} />
              Send client update
            </AdminButton>
          </div>
        }
      />
      {message && <AdminAlert>{message}</AdminAlert>}
      {error && <AdminAlert variant="error">{error}</AdminAlert>}

      <AdminSection title="Project overview" description="Client-facing scope and timeline." accent={overdue ? 'rose' : 'indigo'}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <AdminStatCard
            label="Status"
            value={PROJECT_STATUS_LABELS[p.status] || p.status}
            accent={overdue ? 'rose' : 'blue'}
            icon="FlagIcon"
            hint={overdue ? 'Overdue' : undefined}
          />
          <AdminStatCard label="Start date" value={p.start_date} icon="CalendarIcon" />
          <AdminStatCard label="Original delivery" value={p.original_end_date} icon="ClockIcon" />
          <AdminStatCard label="Current delivery" value={p.current_end_date} accent={overdue ? 'rose' : 'green'} icon="TruckIcon" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <OpsOverviewField label="Project ID">
            <span className="font-mono text-xs">{p.project_code}</span>
          </OpsOverviewField>
          <OpsOverviewField label="Client">
            <Link className="text-indigo-600 hover:underline inline-flex items-center gap-1" href={`/admin/ops/clients/${p.client_id}`}>
              {p.ops_clients?.name}
              <Icon name="ArrowTopRightOnSquareIcon" size={14} />
            </Link>
          </OpsOverviewField>
          <OpsOverviewField label="Type / package">
            {p.project_type} · {p.package_name}
          </OpsOverviewField>
        </div>

        {(p.scope_document_url || p.scope_url) && (
          <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Scope</p>
            <div className="flex flex-wrap gap-3 text-sm">
              {p.scope_document_url && (
                <a className="text-indigo-600 hover:underline inline-flex items-center gap-1" href={p.scope_document_url} target="_blank" rel="noreferrer">
                  <Icon name="DocumentIcon" size={14} />
                  Open PDF
                </a>
              )}
              {p.scope_url && (
                <a className="text-indigo-600 hover:underline truncate max-w-full" href={p.scope_url} target="_blank" rel="noreferrer">
                  {p.scope_url}
                </a>
              )}
            </div>
          </div>
        )}
      </AdminSection>

      <OpsGrid>
        <AdminSection title="Internal estimation" description="Not shared with the client." accent="amber">
          <InternalEstimationGrid
            hours={p.estimated_hours}
            rate={p.cost_per_hour}
            developers={p.developers_count}
            cost={cost}
          />
        </AdminSection>

        <AdminSection title="Update status" accent="sky">
          <div className="space-y-2">
            <select className={adminSelectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
              {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input className={adminInputClass} placeholder="Optional note" value={note} onChange={(e) => setNote(e.target.value)} />
            <AdminButton onClick={patchStatus}>Save status</AdminButton>
          </div>
        </AdminSection>

        <AdminSection title="Extend delivery date" accent="violet">
          <p className="text-sm text-muted-foreground mb-2">
            Current: <strong className="text-foreground">{p.current_end_date}</strong>
          </p>
          <div className="space-y-2">
            <input type="date" className={adminInputClass} min={p.current_end_date} value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            <textarea className={adminTextareaClass} rows={2} placeholder="Reason for extension *" value={reason} onChange={(e) => setReason(e.target.value)} />
            <AdminButton onClick={extend}>Save extension</AdminButton>
          </div>
        </AdminSection>

        <AdminSection title="Tickets" description={`${detail.tickets.length} linked`}>
          {detail.tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">None.</p>
          ) : (
            <div>
              {detail.tickets.map((t) => {
                const ticketOverdue = !isClosedStatus(t.status) && t.current_end_date < todayISO();
                return (
                  <OpsLinkedItem
                    key={t.id}
                    href={`/admin/ops/tickets/${t.id}`}
                    code={t.ticket_code}
                    title={t.title}
                    badge={<AdminBadge variant={ticketOverdue ? 'rose' : 'indigo'}>{TICKET_STATUS_LABELS[t.status] || t.status}</AdminBadge>}
                  />
                );
              })}
            </div>
          )}
        </AdminSection>

        <AdminSection title="Status history" description={`${detail.statusHistory.length} change(s)`}>
          {detail.statusHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No status changes yet.</p>
          ) : (
            <div className="max-h-52 overflow-y-auto pr-1">
              {detail.statusHistory.map((row) => (
                <OpsTimelineItem
                  key={row.id}
                  title={`${row.previous_status ? PROJECT_STATUS_LABELS[row.previous_status as keyof typeof PROJECT_STATUS_LABELS] || row.previous_status : '—'} → ${PROJECT_STATUS_LABELS[row.new_status as keyof typeof PROJECT_STATUS_LABELS] || row.new_status}`}
                  meta={formatOpsWhen(row.created_at)}
                  body={row.note || undefined}
                />
              ))}
            </div>
          )}
        </AdminSection>

        <AdminSection title="Delivery extensions" description={`${detail.extensions.length} extension(s)`} accent="emerald">
          {detail.extensions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No extensions yet.</p>
          ) : (
            <div className="max-h-52 overflow-y-auto pr-1">
              {detail.extensions.map((row) => (
                <OpsTimelineItem
                  key={row.id}
                  title={`${row.previous_end_date} → ${row.new_end_date}`}
                  meta={formatOpsWhen(row.created_at)}
                  body={row.reason}
                />
              ))}
            </div>
          )}
        </AdminSection>

        <OpsGridSpan>
          <AdminSection title="Communication history" description={`${detail.communications.length} message(s)`} accent="indigo">
            <CommunicationAccordion items={detail.communications} emptyMessage="No messages for this project yet." />
          </AdminSection>
        </OpsGridSpan>
      </OpsGrid>

      <WhatsAppModal
        open={waOpen}
        title="Send client update"
        clientName={p.ops_clients?.name || ''}
        whatsapp={p.ops_clients?.whatsapp_number || null}
        message={waMessage}
        onMessage={setWaMessage}
        onClose={() => setWaOpen(false)}
        onSend={sendUpdate}
        sending={sending}
        error={waError}
        warning={waWarning}
      />
    </OpsPageShell>
  );
}
