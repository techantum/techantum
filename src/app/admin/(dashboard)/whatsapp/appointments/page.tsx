'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminBadge from '@/components/admin/AdminBadge';
import { adminInputClass, adminSelectClass } from '@/components/admin/AdminField';
import { OpsPageShell, OpsTd, OpsTh } from '@/components/admin/ops/OpsUi';
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  type AppointmentStatus,
  type WhatsAppAppointment,
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

export default function WhatsAppAppointmentsPage() {
  const [rows, setRows] = useState<WhatsAppAppointment[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (status) params.set('status', status);
    fetch(`/api/admin/whatsapp/appointments?${params}`, { cache: 'no-store' })
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

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of rows) map[row.status] = (map[row.status] || 0) + 1;
    return map;
  }, [rows]);

  return (
    <OpsPageShell>
      <AdminPageHeader
        title="Appointments"
        description="Calls booked from WhatsApp. Update status and notes here — the client receives a professional message."
      />
      {error && <p className="text-sm text-rose-700">{error}</p>}

      <AdminSection title="Pipeline">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {APPOINTMENT_STATUSES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus((current) => (current === value ? '' : value))}
              className={`rounded-xl border px-3 py-2 text-left ${
                status === value ? 'border-indigo-300 bg-indigo-50' : 'border-border bg-white'
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {APPOINTMENT_STATUS_LABELS[value]}
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">{counts[value] || 0}</p>
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            className={`${adminInputClass} max-w-xs`}
            placeholder="Search name, phone or code"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
          <select className={`${adminSelectClass} max-w-[220px]`} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {APPOINTMENT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {APPOINTMENT_STATUS_LABELS[value]}
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
      </AdminSection>

      <AdminSection title="Upcoming and recent calls">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <OpsTh>Code</OpsTh>
                <OpsTh>Contact</OpsTh>
                <OpsTh>When</OpsTh>
                <OpsTh>Requirement</OpsTh>
                <OpsTh>Status</OpsTh>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <OpsTd>
                    <Link href={`/admin/whatsapp/appointments/${row.id}`} className="font-medium text-indigo-700 hover:underline">
                      {row.code}
                    </Link>
                  </OpsTd>
                  <OpsTd>
                    <p className="font-medium text-foreground">{row.contact_name || row.phone}</p>
                    <p className="text-[11px] text-muted-foreground">{row.phone}</p>
                  </OpsTd>
                  <OpsTd>{formatSlotForPeople(row.scheduled_at, row.requested_slot_text)}</OpsTd>
                  <OpsTd>
                    <p className="max-w-xs truncate">{row.requirement || row.service || '—'}</p>
                  </OpsTd>
                  <OpsTd>
                    <AdminBadge variant={statusVariant(row.status)}>
                      {APPOINTMENT_STATUS_LABELS[row.status as AppointmentStatus] || row.status}
                    </AdminBadge>
                  </OpsTd>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <p className="p-4 text-sm text-muted-foreground">Loading appointments…</p>}
          {!loading && rows.length === 0 && <p className="p-4 text-sm text-muted-foreground">No appointments yet.</p>}
        </div>
      </AdminSection>
    </OpsPageShell>
  );
}
