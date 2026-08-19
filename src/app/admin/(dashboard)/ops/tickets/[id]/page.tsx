'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import AdminBadge from '@/components/admin/AdminBadge';
import AdminAlert from '@/components/admin/AdminAlert';
import { adminInputClass, adminSelectClass, adminTextareaClass } from '@/components/admin/AdminField';
import { WhatsAppModal } from '@/components/admin/ops/OpsShared';
import { TICKET_STATUS_LABELS, TICKET_TYPE_LABELS } from '@/lib/ops/config';
import { internalCost, isOverdue, type OpsCommunication, type OpsDateExtension, type OpsStatusHistory, type OpsTicket } from '@/lib/ops/types';
import { todayISO } from '@/lib/ops/working-days';

export default function OpsTicketDetailPage() {
  const id = String(useParams().id);
  const [detail, setDetail] = useState<{ ticket: OpsTicket; statusHistory: OpsStatusHistory[]; extensions: OpsDateExtension[]; communications: OpsCommunication[] } | null>(null);
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
    fetch(`/api/admin/ops/tickets/${id}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Not found');
        setDetail(body);
        setStatus(body.ticket.status);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  };

  useEffect(() => { load(); }, [id]);

  const patchStatus = async () => {
    const res = await fetch(`/api/admin/ops/tickets/${id}/status`, {
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
    const res = await fetch(`/api/admin/ops/tickets/${id}/extend-date`, {
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
    const res = await fetch(`/api/admin/ops/tickets/${id}/whatsapp/preview`, { method: 'POST' });
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
      const res = await fetch(`/api/admin/ops/tickets/${id}/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: waMessage }),
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

  if (!detail) return <p className="text-sm text-muted-foreground">{error || 'Loading…'}</p>;
  const t = detail.ticket;
  const overdue = isOverdue(t.current_end_date, t.status, todayISO());
  const cost = internalCost(Number(t.estimated_hours), Number(t.cost_per_hour));

  return (
    <div className="space-y-6 max-w-5xl">
      <AdminPageHeader
        title={t.title}
        description={`${t.ticket_code} · ${TICKET_TYPE_LABELS[t.ticket_type]}`}
        action={<AdminButton variant="primary" onClick={openUpdate}>Send client update</AdminButton>}
      />
      {message && <AdminAlert>{message}</AdminAlert>}
      {error && <AdminAlert variant="error">{error}</AdminAlert>}

      <AdminSection title="Ticket overview">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <p><span className="text-muted-foreground">Client</span><br /><Link className="text-indigo-600" href={`/admin/ops/clients/${t.client_id}`}>{t.ops_clients?.name}</Link></p>
          <p><span className="text-muted-foreground">Project</span><br /><Link className="text-indigo-600" href={`/admin/ops/projects/${t.project_id}`}>{t.ops_projects?.project_name}</Link></p>
          <p><span className="text-muted-foreground">Status</span><br /><AdminBadge variant={overdue ? 'rose' : 'indigo'}>{TICKET_STATUS_LABELS[t.status]}</AdminBadge> {overdue && <span className="text-rose-700 font-semibold">Overdue</span>}</p>
          <p><span className="text-muted-foreground">Start</span><br />{t.start_date}</p>
          <p><span className="text-muted-foreground">Original delivery</span><br />{t.original_end_date}</p>
          <p><span className="text-muted-foreground">Current delivery</span><br />{t.current_end_date}</p>
        </div>
        {t.description && <p className="text-sm mt-3 whitespace-pre-wrap">{t.description}</p>}
      </AdminSection>

      <AdminSection title="Internal estimation" accent="amber">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <p>Hours<br /><strong>{t.estimated_hours}</strong></p>
          <p>Cost / hour<br /><strong>₹{t.cost_per_hour}</strong></p>
          <p>Developers<br /><strong>{t.developers_count}</strong></p>
          <p>Internal cost<br /><strong>₹{cost.toLocaleString('en-IN')}</strong></p>
        </div>
      </AdminSection>

      <AdminSection title="Update status">
        <div className="flex flex-wrap gap-2">
          <select className={adminSelectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <input className={adminInputClass} placeholder="Optional note" value={note} onChange={(e) => setNote(e.target.value)} />
          <AdminButton onClick={patchStatus}>Save status</AdminButton>
        </div>
      </AdminSection>

      <AdminSection title="Extend delivery date">
        <p className="text-sm text-muted-foreground">Current delivery: {t.current_end_date}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <input type="date" min={t.current_end_date} className={adminInputClass} value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <textarea className={adminTextareaClass} placeholder="Reason *" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <AdminButton className="mt-3" onClick={extend}>Save extension</AdminButton>
      </AdminSection>

      <AdminSection title="Status history">
        {detail.statusHistory.map((row) => (
          <p key={row.id} className="text-sm">{row.previous_status || '—'} → {row.new_status} · {row.note || ''} · {row.created_at}</p>
        ))}
      </AdminSection>
      <AdminSection title="Delivery extension history">
        {detail.extensions.length === 0 ? <p className="text-sm text-muted-foreground">No extensions.</p> : detail.extensions.map((row) => (
          <p key={row.id} className="text-sm">{row.previous_end_date} → {row.new_end_date} · {row.reason}</p>
        ))}
      </AdminSection>
      <AdminSection title="Communication history">
        {detail.communications.length === 0 ? <p className="text-sm text-muted-foreground">No messages yet.</p> : detail.communications.map((c) => (
          <div key={c.id} className="rounded-xl border p-3 text-sm mb-2">
            <p className="text-xs text-muted-foreground">{c.created_at} · {c.status} · {c.recipient}</p>
            <pre className="whitespace-pre-wrap font-sans mt-2">{c.message_body}</pre>
          </div>
        ))}
      </AdminSection>

      <WhatsAppModal
        open={waOpen}
        title="Send client update"
        clientName={t.ops_clients?.name || ''}
        whatsapp={t.ops_clients?.whatsapp_number || null}
        message={waMessage}
        onMessage={setWaMessage}
        onClose={() => setWaOpen(false)}
        onSend={sendUpdate}
        sending={sending}
        error={waError}
        warning={waWarning}
      />
    </div>
  );
}
