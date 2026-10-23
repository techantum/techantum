'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { PartnerNotification } from '@/lib/partner/notifications';
import { PartnerEmpty, PartnerPageHero, partnerCard } from '@/components/partner/PartnerUi';

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
    <div className="w-full space-y-5">
      <PartnerPageHero
        title="Notifications"
        description="Updates on your requirements and proposals."
        action={
          notifications.some((n) => !n.read_at) ? (
            <button type="button" onClick={markAllRead} className="text-sm font-semibold text-secondary hover:underline">
              Mark all read
            </button>
          ) : null
        }
      />

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : notifications.length === 0 ? (
        <PartnerEmpty icon="BellIcon" title="No notifications yet." />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`${partnerCard} p-4 ${n.read_at ? '' : 'border-orange-100 bg-orange-50/60'}`}
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
