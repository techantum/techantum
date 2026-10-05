'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';

const NAV = [
  { href: '/portal/wa', label: 'Dashboard', icon: 'HomeIcon', exact: true },
  { href: '/portal/wa/onboard', label: 'Setup', icon: 'Cog6ToothIcon' },
  { href: '/portal/wa/phones', label: 'Numbers', icon: 'PhoneIcon' },
  { href: '/portal/wa/templates', label: 'Templates', icon: 'DocumentTextIcon' },
  { href: '/portal/wa/messages', label: 'Messages', icon: 'ChatBubbleLeftRightIcon' },
  { href: '/portal/wa/inbox', label: 'Inbox', icon: 'InboxIcon' },
  { href: '/portal/wa/analytics', label: 'Analytics', icon: 'ChartBarIcon' },
  { href: '/portal/wa/settings', label: 'Settings', icon: 'AdjustmentsHorizontalIcon' },
  { href: '/portal/wa/support', label: 'Support', icon: 'LifebuoyIcon' },
];

export default function PortalWorkspace({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const [name, setName] = useState('Techantum Solutions');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/public/wa-onboard/session', { cache: 'no-store' })
      .then((r) => r.json())
      .then((body) => setName(body.companyName || body.name || 'Techantum Solutions'))
      .catch(() => undefined);
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase() || '')
    .join('') || 'TS';

  return (
    <div className="page-container py-6 sm:py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <nav className="flex flex-wrap items-center gap-1.5">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-secondary text-white'
                    : 'text-slate-600 hover:bg-white hover:text-secondary'
                }`}
              >
                <Icon name={item.icon} size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1.5 pr-3 text-sm font-medium text-slate-800"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-white">{initials}</span>
            <span className="max-w-[180px] truncate">{name}</span>
            <Icon name="ChevronDownIcon" size={14} className="text-slate-400" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-20 mt-2 w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
              <Link href="/portal/wa/settings" className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setMenuOpen(false)}>
                Account settings
              </Link>
              <button type="button" onClick={signOut} className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50">
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
