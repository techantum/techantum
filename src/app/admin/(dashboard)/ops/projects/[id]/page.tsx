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

  useEffect(() => { load(); }, [id]);

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

  if (!detail) return <p className="text-sm text-muted-foreground">{error || 'Loading…'}</p>;
  const p = detail.project;
  const overdue = isOverdue(p.current_end_date, p.status, todayISO());
  const cost = internalCost(Number(p.estimated_hours), Number(p.cost_per_hour));

  return (
    <div className="space-y-6 max-w-5xl">
      <AdminPageHeader
        title={p.project_name}
        description={`${p.project_code} · ${p.ops_clients?.name || ''}`}
        action={<AdminButton variant="primary" onClick={openUpdate}>Send client update</AdminButton>}
      />
      {message && <AdminAlert>{message}</AdminAlert>}
      {error && <AdminAlert variant="error">{error}</AdminAlert>}

      <AdminSection title="Project overview">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <p><span className="text-muted-foreground">Project ID</span><br />{p.project_code}</p>
          <p><span className="text-muted-foreground">Client</span><br /><Link className="text-indigo-600" href={`/admin/ops/clients/${p.client_id}`}>{p.ops_clients?.name}</Link></p>
          <p><span className="text-muted-foreground">Type / package</span><br />{p.project_type} · {p.package_name}</p>
          <p><span className="text-muted-foreground">Status</span><br /><AdminBadge variant={overdue ? 'rose' : 'indigo'}>{PROJECT_STATUS_LABELS[p.status] || p.status}</AdminBadge> {overdue && <span className="text-rose-700 font-semibold">Overdue</span>}</p>
          <p><span className="text-muted-foreground">Start</span><br />{p.start_date}</p>
          <p><span className="text-muted-foreground">Original delivery</span><br />{p.original_end_date}</p>
          <p><span className="text-muted-foreground">Current delivery</span><br />{p.current_end_date}</p>
        </div>
      </AdminSection>

      <AdminSection title="Project scope">
        {p.scope_document_url ? <a className="text-indigo-600 text-sm" href={p.scope_document_url} target="_blank" rel="noreferrer">Open PDF</a> : <p className="text-sm text-muted-foreground">No PDF uploaded.</p>}
        {p.scope_url && <p className="text-sm mt-2"><a className="text-indigo-600" href={p.scope_url} target="_blank" rel="noreferrer">{p.scope_url}</a></p>}
      </AdminSection>

      <AdminSection title="Internal estimation" description="Internal only. Never included in WhatsApp messages." accent="amber">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <p><span className="text-muted-foreground">Hours</span><br />{p.estimated_hours}</p>
          <p><span className="text-muted-foreground">Cost / hour</span><br />₹{p.cost_per_hour}</p>
          <p><span className="text-muted-foreground">Developers</span><br />{p.developers_count}</p>
          <p><span className="text-muted-foreground">Internal cost</span><br />₹{cost.toLocaleString('en-IN')}</p>
        </div>
      </AdminSection>

      <AdminSection title="Update status">
        <div className="flex flex-wrap gap-2">
          <select className={adminSelectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <input className={adminInputClass} placeholder="Optional note" value={note} onChange={(e) => setNote(e.target.value)} />
          <AdminButton onClick={patchStatus}>Save status</AdminButton>
        </div>
      </AdminSection>

      <AdminSection title="Extend delivery date">
        <p className="text-sm text-muted-foreground">Current delivery: {p.current_end_date}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <input type="date" className={adminInputClass} min={p.current_end_date} value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <textarea className={adminTextareaClass} placeholder="Reason for extension *" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <AdminButton className="mt-3" onClick={extend}>Save extension</AdminButton>
      </AdminSection>

      <AdminSection title="Tickets">
        {detail.tickets.length === 0 ? <p className="text-sm text-muted-foreground">None.</p> : detail.tickets.map((t) => (
          <p key={t.id} className="text-sm">
            <Link className="text-indigo-600 hover:underline" href={`/admin/ops/tickets/${t.id}`}>{t.ticket_code} · {t.title}</Link>{' '}
            <AdminBadge>{TICKET_STATUS_LABELS[t.status] || t.status}</AdminBadge>
            {!isClosedStatus(t.status) && t.current_end_date < todayISO() && <span className="ml-2 text-xs text-rose-700 font-semibold">Overdue</span>}
          </p>
        ))}
      </AdminSection>

      <AdminSection title="Delivery extension history">
        {detail.extensions.length === 0 ? <p className="text-sm text-muted-foreground">No extensions.</p> : detail.extensions.map((row) => (
          <p key={row.id} className="text-sm">{row.previous_end_date} → {row.new_end_date} · {row.reason} · {row.created_at}</p>
        ))}
      </AdminSection>
      <AdminSection title="Status history">
        {detail.statusHistory.map((row) => (
          <p key={row.id} className="text-sm">{row.previous_status || '—'} → {row.new_status} · {row.note || ''} · {row.created_at}</p>
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
    </div>
  );
}
