'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import NavIcon from '@/components/ui/NavIcon';
import SafeImage from '@/components/ui/SafeImage';
import { formatAgo } from '@/lib/youtube/home-display';

function AvatarMark({ name, src, size = 'h-9 w-9 text-xs' }: { name: string; src?: string | null; size?: string }) {
  const letter = (name || 'U').charAt(0).toUpperCase();
  const fallback = <span className={`inline-flex items-center justify-center rounded-full bg-[#7C3AED] font-bold text-white ${size}`}>{letter}</span>;
  if (!src) return fallback;
  return <SafeImage src={src} alt="" className={`${size} rounded-full object-cover`} fallback={fallback} />;
}

export default function AppHeaderActions({
  name,
  email,
  avatarUrl,
}: {
  name: string;
  email?: string;
  avatarUrl?: string | null;
}) {
  const [open, setOpen] = useState<'profile' | 'notes' | ''>('');
  const [notes, setNotes] = useState<{ id: string; title: string; detail: string; createdAt: string }[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen('');
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    fetch('/api/account/notifications')
      .then((res) => res.json())
      .then((data) => setNotes(data.rows || []))
      .catch(() => setNotes([]));
  }, []);

  const menu = 'absolute right-0 top-11 z-[80] w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-xl';

  return (
    <div ref={wrapRef} className="relative flex items-center gap-1">
      <button
        type="button"
        className="relative rounded-full p-1 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
        aria-label="Notifications"
        onClick={() => setOpen(open === 'notes' ? '' : 'notes')}
      >
        <NavIcon name="BellIcon" itemKey="notes" className="h-9 w-9 rounded-full" size={18} />
        {notes.length ? <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" /> : null}
      </button>
      {open === 'notes' ? (
        <div className={`${menu} w-80`}>
          <p className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Notifications</p>
          {notes.length ? notes.map((item) => (
            <div key={item.id} className="border-t border-slate-50 px-4 py-2.5">
              <p className="text-sm font-medium text-slate-800">{item.title}</p>
              <p className="text-xs text-slate-500">{item.detail} · {formatAgo(item.createdAt)}</p>
            </div>
          )) : (
            <p className="px-4 py-6 text-sm text-slate-500">You&apos;re all caught up.</p>
          )}
        </div>
      ) : null}

      <button
        type="button"
        className="rounded-full p-0.5 ring-2 ring-transparent hover:ring-violet-100"
        aria-label="Profile menu"
        onClick={() => setOpen(open === 'profile' ? '' : 'profile')}
      >
        <AvatarMark name={name} src={avatarUrl} />
      </button>
      {open === 'profile' ? (
        <div className={menu}>
          <div className="flex items-center gap-3 px-4 py-3">
            <AvatarMark name={name} src={avatarUrl} size="h-10 w-10 text-sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
              {email ? <p className="truncate text-xs text-slate-500">{email}</p> : null}
            </div>
          </div>
          <Link href="/profile" className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50" onClick={() => setOpen('')}>
            <NavIcon name="PencilSquareIcon" itemKey="profile" className="h-7 w-7 rounded-lg" size={14} /> Edit profile
          </Link>
          <Link href="/" className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50" onClick={() => setOpen('')}>
            <NavIcon name="GlobeAltIcon" itemKey="website" className="h-7 w-7 rounded-lg" size={14} delay={80} /> Visit website
          </Link>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50">
              <NavIcon name="ArrowRightOnRectangleIcon" itemKey="logout" className="h-7 w-7 rounded-lg" size={14} delay={160} /> Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
