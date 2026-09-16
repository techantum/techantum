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
import type {
  ConversationStatus,
  LeadStage,
  WhatsAppContact,
  WhatsAppConversation,
  WhatsAppConversationNote,
  WhatsAppMessage,
} from '@/lib/whatsapp/types';
import { normalizeQualification, qualificationFacts, serviceLabel } from '@/lib/whatsapp/qualification';

type Detail = {
  conversation: WhatsAppConversation;
  messages: WhatsAppMessage[];
  lead: Record<string, unknown> | null;
  appointment?: { id: string; code: string; status: string; requested_slot_text?: string | null; scheduled_at?: string | null } | null;
  notes?: WhatsAppConversationNote[];
};

const LEAD_STAGES: { value: LeadStage; label: string }[] = [
  { value: 'NEW', label: 'New' },
  { value: 'ENGAGED', label: 'Engaged' },
  { value: 'REQUIREMENT_IDENTIFIED', label: 'Requirement identified' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'PROPOSAL_REQUESTED', label: 'Proposal requested' },
  { value: 'HUMAN_FOLLOWUP', label: 'Human follow-up' },
  { value: 'CONVERTED', label: 'Converted' },
  { value: 'LOST', label: 'Lost' },
];

const CONVERSATION_STATUSES: { value: ConversationStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'ARCHIVED', label: 'Archived' },
];

function contactLabel(contact?: WhatsAppContact | null) {
  if (!contact) return 'Unknown';
  return (contact.first_name || contact.profile_name || contact.phone_number || 'Unknown').replace(/^~/, '').trim();
}

function formatWhen(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function WhatsAppChatDetailPage() {
  const id = String(useParams().id);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch(`/api/admin/whatsapp/conversations/${id}`, { cache: 'no-store' })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Not found');
        setDetail(body);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  };

  useEffect(() => {
    load();
  }, [id]);

  const updateStatus = async (patch: { lead_stage?: string; status?: string }) => {
    setError('');
    setMessage('');
    const res = await fetch(`/api/admin/whatsapp/conversations/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const body = await res.json();
    if (!res.ok) return setError(body.error || 'Status update failed');
    setMessage('Status updated.');
    load();
  };

  const saveNote = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`/api/admin/whatsapp/conversations/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: note }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Save failed');
      setDetail(body);
      setNote('');
      setMessage('Note saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!detail) {
    return (
      <OpsPageShell>
        <AdminPageHeader title="Chat" description="Loading conversation…" />
        {error && <AdminAlert variant="error">{error}</AdminAlert>}
      </OpsPageShell>
    );
  }

  const conversation = detail.conversation;
  const contact = conversation.whatsapp_contacts as WhatsAppContact | undefined;
  const qualification = normalizeQualification(conversation.qualification);
  const facts = qualificationFacts(qualification);
  const booked = Boolean(detail.appointment?.id || qualification.appointment_id);
  const notes = detail.notes || [];

  return (
    <OpsPageShell>
      <AdminPageHeader
        title={contactLabel(contact)}
        description={`${contact?.phone_number || 'No number'} · ${formatWhen(contact?.first_contact_at || conversation.created_at || conversation.last_inbound_at)}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/whatsapp/chats">
              <AdminButton>Back to list</AdminButton>
            </Link>
            <Link href="/admin/whatsapp/inbox">
              <AdminButton variant="primary">Open inbox</AdminButton>
            </Link>
          </div>
        }
      />
      {message && <AdminAlert>{message}</AdminAlert>}
      {error && <AdminAlert variant="error">{error}</AdminAlert>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="space-y-4">
          <AdminSection title="Chat details">
            <div className="grid gap-3 sm:grid-cols-2">
              <OpsOverviewField label="Client name">{contactLabel(contact)}</OpsOverviewField>
              <OpsOverviewField label="Contact number">{contact?.phone_number || '—'}</OpsOverviewField>
              <OpsOverviewField label="Contacted">
                {formatWhen(contact?.first_contact_at || conversation.created_at || conversation.last_inbound_at)}
              </OpsOverviewField>
              <OpsOverviewField label="Service required">{serviceLabel(qualification.service)}</OpsOverviewField>
              <OpsOverviewField label="Appointment booked?">
                {booked ? (
                  detail.appointment?.id ? (
                    <Link href={`/admin/whatsapp/appointments/${detail.appointment.id}`} className="text-indigo-700 hover:underline">
                      Yes · {detail.appointment.code}
                    </Link>
                  ) : (
                    'Yes'
                  )
                ) : (
                  'No'
                )}
              </OpsOverviewField>
              <OpsOverviewField label="Last message">{formatWhen(conversation.last_inbound_at)}</OpsOverviewField>
            </div>
            {qualification.brief ? (
              <div className="mt-3">
                <OpsOverviewField label="What they want">{qualification.brief}</OpsOverviewField>
              </div>
            ) : null}
            {facts.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {facts
                  .filter((row) => row.label !== 'What they want')
                  .map((row) => (
                    <AdminBadge key={`${row.label}-${row.value}`} variant="indigo">
                      {row.label}: {row.value}
                    </AdminBadge>
                  ))}
              </div>
            ) : null}
          </AdminSection>

          <AdminSection title="Status">
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="Lead status">
                <select
                  className={adminSelectClass}
                  value={conversation.lead_stage}
                  onChange={(e) => updateStatus({ lead_stage: e.target.value })}
                >
                  {LEAD_STAGES.map((stage) => (
                    <option key={stage.value} value={stage.value}>
                      {stage.label}
                    </option>
                  ))}
                </select>
              </AdminField>
              <AdminField label="Chat status">
                <select
                  className={adminSelectClass}
                  value={conversation.status}
                  onChange={(e) => updateStatus({ status: e.target.value })}
                >
                  {CONVERSATION_STATUSES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </AdminField>
            </div>
          </AdminSection>

          <AdminSection title="Add note" description="Internal notes for the team. These are not sent to the client.">
            <AdminField label="Notes">
              <textarea
                className={`${adminTextareaClass} min-h-[140px]`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Example: Spoke with them. They want a product catalogue website and will share references tomorrow."
              />
            </AdminField>
            <AdminButton variant="primary" disabled={saving || !note.trim()} onClick={saveNote}>
              {saving ? 'Saving…' : 'Save'}
            </AdminButton>
          </AdminSection>
        </div>

        <div className="space-y-4">
          <AdminSection title="Notes">
            {notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
            <div className="space-y-1">
              {notes.map((item) => (
                <OpsTimelineItem
                  key={item.id}
                  title="Staff note"
                  meta={formatWhen(item.created_at)}
                  body={item.body}
                />
              ))}
            </div>
          </AdminSection>

          <AdminSection title="Recent messages">
            {detail.messages.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
            <div className="max-h-[420px] space-y-2 overflow-y-auto">
              {detail.messages.slice(-12).map((item) => (
                <div key={item.id} className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {item.sender_type === 'CUSTOMER' ? 'Client' : item.sender_type === 'AI' ? 'Assistant' : 'Staff'} ·{' '}
                    {formatWhen(item.created_at)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{item.text_content}</p>
                </div>
              ))}
            </div>
          </AdminSection>
        </div>
      </div>
    </OpsPageShell>
  );
}
