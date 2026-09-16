'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminBadge from '@/components/admin/AdminBadge';
import { adminInputClass, adminSelectClass } from '@/components/admin/AdminField';
import { OpsPageShell, OpsTd, OpsTh } from '@/components/admin/ops/OpsUi';
import type { LeadStage, WhatsAppContact, WhatsAppConversation } from '@/lib/whatsapp/types';
import { normalizeQualification, serviceLabel } from '@/lib/whatsapp/qualification';

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

function contactLabel(contact?: WhatsAppContact | null) {
  if (!contact) return 'Unknown';
  return (contact.first_name || contact.profile_name || contact.phone_number || 'Unknown').replace(/^~/, '').trim();
}

function formatWhen(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function WhatsAppChatsPage() {
  const [rows, setRows] = useState<WhatsAppConversation[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    fetch(`/api/admin/whatsapp/conversations?search=${encodeURIComponent(search)}`, { cache: 'no-store' })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Failed to load');
        setRows(body);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, lead_stage: string) => {
    setUpdatingId(id);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`/api/admin/whatsapp/conversations/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_stage }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Status update failed');
      setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...body } : row)));
      setMessage('Status updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const visible = rows.filter((row) => !status || row.lead_stage === status);

  return (
    <OpsPageShell>
      <AdminPageHeader
        title="Chats"
        description="All WhatsApp conversations in a list. Update status here, or open a chat to add notes."
      />
      {message && <AdminAlert>{message}</AdminAlert>}
      {error && <AdminAlert variant="error">{error}</AdminAlert>}

      <AdminSection title="All chats">
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            className={`${adminInputClass} max-w-xs`}
            placeholder="Search name, phone or company"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
          <select className={`${adminSelectClass} max-w-[240px]`} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {LEAD_STAGES.map((stage) => (
              <option key={stage.value} value={stage.value}>
                {stage.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={load}
            className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <OpsTh>Client name</OpsTh>
                <OpsTh>Contacted</OpsTh>
                <OpsTh>Contact number</OpsTh>
                <OpsTh>Service required</OpsTh>
                <OpsTh>Appointment booked?</OpsTh>
                <OpsTh>Status</OpsTh>
                <OpsTh>View</OpsTh>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const contact = row.whatsapp_contacts as WhatsAppContact | undefined;
                const qualification = normalizeQualification(row.qualification);
                const booked = Boolean(row.appointment?.id || qualification.appointment_id);
                return (
                  <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <OpsTd>
                      <p className="font-medium text-foreground">{contactLabel(contact)}</p>
                      {contact?.company_name ? (
                        <p className="text-[11px] text-muted-foreground">{contact.company_name}</p>
                      ) : null}
                    </OpsTd>
                    <OpsTd>{formatWhen(contact?.first_contact_at || row.created_at || row.last_inbound_at)}</OpsTd>
                    <OpsTd>{contact?.phone_number || '—'}</OpsTd>
                    <OpsTd>
                      <p>{serviceLabel(qualification.service)}</p>
                      {qualification.brief ? (
                        <p className="mt-0.5 max-w-xs truncate text-[11px] text-muted-foreground">{qualification.brief}</p>
                      ) : null}
                    </OpsTd>
                    <OpsTd>
                      <AdminBadge variant={booked ? 'green' : 'default'}>{booked ? 'Yes' : 'No'}</AdminBadge>
                    </OpsTd>
                    <OpsTd>
                      <select
                        className={`${adminSelectClass} min-w-[180px] py-1.5 text-sm`}
                        value={row.lead_stage}
                        disabled={updatingId === row.id}
                        onChange={(e) => updateStatus(row.id, e.target.value)}
                      >
                        {LEAD_STAGES.map((stage) => (
                          <option key={stage.value} value={stage.value}>
                            {stage.label}
                          </option>
                        ))}
                      </select>
                    </OpsTd>
                    <OpsTd>
                      <Link href={`/admin/whatsapp/chats/${row.id}`} className="font-medium text-indigo-700 hover:underline">
                        View
                      </Link>
                    </OpsTd>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {loading && <p className="p-4 text-sm text-muted-foreground">Loading chats…</p>}
          {!loading && visible.length === 0 && <p className="p-4 text-sm text-muted-foreground">No chats yet.</p>}
        </div>
      </AdminSection>
    </OpsPageShell>
  );
}
