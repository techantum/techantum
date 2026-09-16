'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminBadge from '@/components/admin/AdminBadge';
import AdminField, { adminSelectClass, adminTextareaClass } from '@/components/admin/AdminField';
import { OpsOverviewField, OpsPageShell, OpsTimelineItem } from '@/components/admin/ops/OpsUi';
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  type AppointmentStatus,
  type WhatsAppAppointment,
  type WhatsAppAppointmentUpdate,
} from '@/lib/whatsapp/appointment-types';
import { formatSlotForPeople } from '@/lib/whatsapp/appointment-slot';

function statusVariant(status: string): 'sky' | 'indigo' | 'amber' | 'green' | 'violet' | 'rose' | 'default' {
  if (status === 'SCHEDULED') return 'sky';
  if (status === 'CONFIRMED') return 'indigo';
  if (status === 'IN_DISCUSSION') return 'amber';
  if (status === 'COMPLETED') return 'green';
  if (status === 'FOLLOW_UP') return 'violet';
  if (status === 'NO_SHOW' || status === 'CANCELLED') return 'rose';
  return 'default';
}

export default function WhatsAppAppointmentDetailPage() {
  const id = String(useParams().id);
  const [appointment, setAppointment] = useState<WhatsAppAppointment | null>(null);
  const [updates, setUpdates] = useState<WhatsAppAppointmentUpdate[]>([]);
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [sendToClient, setSendToClient] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch(`/api/admin/whatsapp/appointments/${id}`, { cache: 'no-store' })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Not found');
        setAppointment(body.appointment);
        setUpdates(body.updates || []);
        setStatus(body.appointment.status);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  };

  useEffect(() => {
    load();
  }, [id]);

  const save = async (kind: 'status' | 'note') => {
    if (!appointment) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload =
        kind === 'status'
          ? { status, send_to_client: sendToClient }
          : { status, body: notes, send_to_client: sendToClient };
      if (kind === 'note' && !notes.trim()) throw new Error('Write an update for the client first.');
      const res = await fetch(`/api/admin/whatsapp/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Save failed');
      setAppointment(body.appointment);
      setUpdates(body.updates || []);
      setStatus(body.appointment.status);
      if (kind === 'note') setNotes('');
      if (body.sendError) {
        setError(`Saved, but WhatsApp could not be sent: ${body.sendError}`);
      } else {
        setMessage(
          sendToClient
            ? 'Saved and sent a professional update to the client on WhatsApp.'
            : 'Saved internally. The client was not messaged.'
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!appointment) {
    return (
      <OpsPageShell>
        <AdminPageHeader title="Appointment" description="Loading call details…" />
        {error && <AdminAlert variant="error">{error}</AdminAlert>}
      </OpsPageShell>
    );
  }

  return (
    <OpsPageShell>
      <AdminPageHeader
        title={appointment.code}
        description={`${appointment.contact_name || appointment.phone} · ${formatSlotForPeople(appointment.scheduled_at, appointment.requested_slot_text)}`}
        action={
          appointment.conversation_id ? (
            <Link href={`/admin/whatsapp/inbox`}>
              <AdminButton>Open inbox</AdminButton>
            </Link>
          ) : null
        }
      />
      {message && <AdminAlert>{message}</AdminAlert>}
      {error && <AdminAlert variant="error">{error}</AdminAlert>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="space-y-4">
          <AdminSection title="Call details">
            <div className="grid gap-3 sm:grid-cols-2">
              <OpsOverviewField label="Contact">{appointment.contact_name || '—'}</OpsOverviewField>
              <OpsOverviewField label="Phone">{appointment.phone}</OpsOverviewField>
              <OpsOverviewField label="When">
                {formatSlotForPeople(appointment.scheduled_at, appointment.requested_slot_text)}
              </OpsOverviewField>
              <OpsOverviewField label="Service">{appointment.service || '—'}</OpsOverviewField>
            </div>
            <div className="mt-3">
              <OpsOverviewField label="Requirement">{appointment.requirement || 'Waiting for a short brief.'}</OpsOverviewField>
            </div>
            <div className="mt-3">
              <AdminBadge variant={statusVariant(appointment.status)}>
                {APPOINTMENT_STATUS_LABELS[appointment.status as AppointmentStatus]}
              </AdminBadge>
            </div>
          </AdminSection>

          <AdminSection
            title="Client update"
            description="Saving sends this to the customer on WhatsApp in a professional format, unless you uncheck that option."
          >
            <AdminField label="Status">
              <select className={adminSelectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
                {APPOINTMENT_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {APPOINTMENT_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField label="Discussion notes / next update" hint="Write in simple language. We wrap it professionally before sending.">
              <textarea
                className={`${adminTextareaClass} min-h-[140px]`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Example: We understood you need a website to showcase products and collect enquiries. We will share a proposed approach by Friday."
              />
            </AdminField>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={sendToClient} onChange={(e) => setSendToClient(e.target.checked)} />
              Send this update to the client on WhatsApp
            </label>
            <div className="flex flex-wrap gap-2">
              <AdminButton variant="primary" disabled={saving} onClick={() => save('note')}>
                {saving ? 'Saving…' : 'Save notes and send'}
              </AdminButton>
              <AdminButton disabled={saving || status === appointment.status} onClick={() => save('status')}>
                Update status{sendToClient ? ' and notify' : ''}
              </AdminButton>
            </div>
          </AdminSection>
        </div>

        <AdminSection title="Activity">
          {updates.length === 0 && <p className="text-sm text-muted-foreground">No updates yet.</p>}
          <div className="space-y-1">
            {updates.map((item) => (
              <OpsTimelineItem
                key={item.id}
                title={
                  item.kind === 'BOOKED'
                    ? 'Call booked from WhatsApp'
                    : item.kind === 'STATUS'
                      ? `Status: ${item.status ? APPOINTMENT_STATUS_LABELS[item.status as AppointmentStatus] || item.status : 'Updated'}`
                      : 'Notes shared'
                }
                meta={`${new Date(item.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}${
                  item.sent_to_client ? ' · Sent to client' : item.client_message ? ' · Send failed' : ' · Internal'
                }`}
                body={item.body || item.client_message || undefined}
              />
            ))}
          </div>
        </AdminSection>
      </div>
    </OpsPageShell>
  );
}
