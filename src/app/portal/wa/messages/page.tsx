'use client';

import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { Pill, StatTile, formatWhenTime, initials } from '@/components/whatsapp/portal-ui';

type Message = {
  id: string;
  wamid?: string;
  preview?: string;
  type?: string;
  direction?: string;
  status?: string;
  created_at?: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  failed_at?: string;
  error_message?: string;
  contact_name?: string;
  contact_phone?: string;
  whatsapp_number?: string;
  verified_name?: string;
  template_name?: string;
  template_category?: string;
  template_language?: string;
};

function statusTone(status?: string) {
  const value = String(status || '').toUpperCase();
  if (value === 'READ') return { label: 'Read', tone: 'emerald' as const };
  if (value === 'DELIVERED') return { label: 'Delivered', tone: 'sky' as const };
  if (value === 'FAILED') return { label: 'Failed', tone: 'rose' as const };
  if (value === 'PENDING' || value === 'QUEUED') return { label: 'Pending', tone: 'amber' as const };
  return { label: status || 'Sent', tone: 'slate' as const };
}

export default function PortalMessagesPage() {
  const [rows, setRows] = useState<Message[]>([]);
  const [overview, setOverview] = useState({ sent: 0, delivered: 0, read: 0, failed: 0, deliveryRate: 0, readRate: 0, failureRate: 0 });
  const [q, setQ] = useState('');
  const [direction, setDirection] = useState('ALL');
  const [type, setType] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [number, setNumber] = useState('ALL');
  const [selected, setSelected] = useState<Message | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/portal/wa/messages').then((r) => r.json()),
      fetch('/api/portal/wa/dashboard?range=last_30').then((r) => r.json()),
    ])
      .then(([messages, dash]) => {
        setRows(messages.rows || []);
        setOverview(dash.analytics?.overview || overview);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load messages.'));
  }, []);

  const numbers = useMemo(() => Array.from(new Set(rows.map((row) => row.whatsapp_number).filter(Boolean))), [rows]);
  const filtered = rows.filter((row) => {
    const hay = `${row.contact_name || ''} ${row.contact_phone || ''} ${row.preview || ''}`.toLowerCase();
    return (
      (!q || hay.includes(q.toLowerCase())) &&
      (direction === 'ALL' || row.direction === direction) &&
      (type === 'ALL' || String(row.type || '').toLowerCase() === type.toLowerCase()) &&
      (status === 'ALL' || String(row.status || '').toUpperCase() === status) &&
      (number === 'ALL' || row.whatsapp_number === number)
    );
  });

  const exportCsv = () => {
    const header = ['Contact', 'Phone', 'Preview', 'Type', 'Direction', 'Status', 'Sent'];
    const lines = filtered.map((row) => [row.contact_name, row.contact_phone, row.preview, row.type, row.direction, row.status, row.sent_at || row.created_at].map((v) => `"${String(v || '').replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'whatsapp-message-activity.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Message Activity</p>
          <h1 className="mt-1 font-bricolage text-3xl font-bold text-slate-900">WhatsApp Message Activity</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            View all messages sent and received through your connected WhatsApp numbers. Track delivery status, monitor customer conversations and export reports.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">Last 30 days</span>
          <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium">
            <Icon name="ArrowDownTrayIcon" size={16} /> Export CSV
          </button>
        </div>
      </div>

      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Messages Sent" value={overview.sent ?? 0} hint="Last 30 days" icon="PaperAirplaneIcon" />
        <StatTile label="Delivered" value={overview.delivered ?? 0} hint={`${overview.deliveryRate ?? 0}% delivery rate`} icon="CheckCircleIcon" tone="emerald" />
        <StatTile label="Read" value={overview.read ?? 0} hint={`${overview.readRate ?? 0}% read rate`} icon="EyeIcon" tone="sky" />
        <StatTile label="Failed" value={overview.failed ?? 0} hint={`${overview.failureRate ?? 0}% failure rate`} icon="ExclamationTriangleIcon" tone="rose" />
      </div>

      <div className={`grid gap-4 ${selected ? 'xl:grid-cols-[1fr_340px]' : ''}`}>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-3">
            <label className="relative grow">
              <Icon name="MagnifyingGlassIcon" size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, phone number or message content" className="w-full rounded-full border border-slate-200 py-2 pl-8 pr-3 text-sm" />
            </label>
            <select value={number} onChange={(e) => setNumber(e.target.value)} className="rounded-full border border-slate-200 px-3 py-2 text-sm">
              <option value="ALL">All Numbers</option>
              {numbers.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select value={direction} onChange={(e) => setDirection(e.target.value)} className="rounded-full border border-slate-200 px-3 py-2 text-sm">
              <option value="ALL">All Directions</option>
              <option value="OUTBOUND">Outbound</option>
              <option value="INBOUND">Inbound</option>
            </select>
            <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-full border border-slate-200 px-3 py-2 text-sm">
              <option value="ALL">All Message Types</option>
              <option value="text">Text</option>
              <option value="template">Template</option>
              <option value="image">Image</option>
              <option value="document">Document</option>
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-full border border-slate-200 px-3 py-2 text-sm">
              <option value="ALL">All Statuses</option>
              <option value="READ">Read</option>
              <option value="DELIVERED">Delivered</option>
              <option value="FAILED">Failed</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-3 py-3">Message Preview</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Direction</th>
                  <th className="px-3 py-3">WhatsApp Number</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-5 py-3">Sent At</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const pill = statusTone(row.status);
                  return (
                    <tr key={row.id} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50" onClick={() => setSelected(row)}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{initials(row.contact_name)}</span>
                          <span>
                            <span className="block font-medium text-slate-900">{row.contact_name || 'Unknown'}</span>
                            <span className="block text-xs text-slate-400">{row.contact_phone || '—'}</span>
                          </span>
                        </div>
                      </td>
                      <td className="max-w-xs truncate px-3 py-4 text-slate-600">{row.preview || '—'}</td>
                      <td className="px-3 py-4 capitalize">{row.type || 'text'}</td>
                      <td className="px-3 py-4">{row.direction === 'INBOUND' ? 'Inbound' : 'Outbound'}</td>
                      <td className="px-3 py-4">{row.whatsapp_number || '—'}</td>
                      <td className="px-3 py-4">
                        <Pill label={pill.label} tone={pill.tone} />
                      </td>
                      <td className="px-5 py-4">{formatWhenTime(row.sent_at || row.created_at)}</td>
                    </tr>
                  );
                })}
                {!filtered.length ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">
                      No messages yet. Activity from Meta appears here after conversations start.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">Showing {filtered.length} of {rows.length} messages</p>
        </div>

        {selected ? (
          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Message Details</p>
                <p className="text-xs text-slate-400">{selected.contact_name || selected.contact_phone}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="text-slate-400">
                <Icon name="XMarkIcon" size={16} />
              </button>
            </div>
            <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{selected.preview || 'No message body stored.'}</p>
            <dl className="mt-4 space-y-2 text-sm">
              {[
                ['Message ID', selected.wamid || selected.id],
                ['Message Type', selected.template_name ? 'Template' : selected.type],
                ['Template Name', selected.template_name || '—'],
                ['Category', selected.template_category || '—'],
                ['Language', selected.template_language || '—'],
                ['Direction', selected.direction === 'INBOUND' ? 'Inbound' : 'Outbound'],
                ['WhatsApp Number', selected.whatsapp_number || '—'],
                ['Status', selected.status || '—'],
                ['Sent At', formatWhenTime(selected.sent_at || selected.created_at)],
                ['Delivered At', formatWhenTime(selected.delivered_at)],
                ['Read At', formatWhenTime(selected.read_at)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-slate-400">{label}</dt>
                  <dd className="text-right font-medium text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>
            {selected.error_message ? <p className="mt-3 text-xs text-rose-600">{selected.error_message}</p> : null}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
