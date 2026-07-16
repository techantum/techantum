'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import type { PartnerNotification } from '@/lib/partner/notifications';

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
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bricolage text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">Updates on your requirements and proposals.</p>
        </div>
        {notifications.some((n) => !n.read_at) && (
          <button
            type="button"
            onClick={markAllRead}
            className="text-sm text-indigo-600 hover:underline"
          >
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading…</p>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Icon name="BellIcon" size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`bg-white rounded-xl border p-4 ${
                n.read_at ? 'border-slate-200' : 'border-indigo-300 bg-indigo-50/30'
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
                    className="text-xs text-indigo-600 hover:underline shrink-0"
                  >
                    Mark read
                  </button>
                )}
              </div>
              {n.link && (
                <Link
                  href={n.link}
                  className="inline-block mt-3 text-sm text-indigo-600 hover:underline"
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
