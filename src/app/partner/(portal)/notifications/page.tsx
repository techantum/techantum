'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import type { PartnerNotification } from '@/lib/partner/notifications';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function PartnerNotificationsPage() {
  const [notifications, setNotifications] = useState<PartnerNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/partner/notifications')
      .then((r) => r.json())
      .then((data) => setNotifications(data.notifications ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (id: string) => {
    await fetch('/api/partner/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    load();
  };

  const markAllRead = async () => {
    await fetch('/api/partner/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    });
    load();
  };

  return (
    <div className="w-full space-y-6">
      <AdminPageHeader
        kicker="Partner portal"
        title="Notifications"
        description="Updates on your requirements and proposals."
        action={
          notifications.some((n) => !n.read_at) ? (
            <button
              type="button"
              onClick={markAllRead}
              className="text-sm font-semibold text-secondary hover:underline"
            >
              Mark all read
            </button>
          ) : null
        }
      />

      {loading ? (
        <p className="text-slate-500 text-sm">Loading…</p>
      ) : notifications.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <Icon name="BellIcon" size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-3xl border bg-white p-4 shadow-sm ${
                n.read_at ? 'border-slate-200' : 'border-orange-200 bg-orange-50/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{n.title}</p>
                  <p className="text-sm text-slate-600 mt-1">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    {new Date(n.created_at).toLocaleString('en-IN')}
                  </p>
                </div>
                {!n.read_at && (
                  <button
                    type="button"
                    onClick={() => markRead(n.id)}
                    className="text-xs text-secondary hover:underline shrink-0"
                  >
                    Mark read
                  </button>
                )}
              </div>
              {n.link && (
                <Link
                  href={n.link}
                  className="inline-block mt-3 text-sm text-secondary hover:underline"
                  onClick={() => !n.read_at && markRead(n.id)}
                >
                  View details →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
