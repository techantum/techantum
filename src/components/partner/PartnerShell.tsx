'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';
import PartnerBrandMark from '@/components/partner/PartnerBrandMark';
import { visiblePartnerNavItems } from '@/lib/partner/nav';
import { PARTNER_TIER_LABELS, type Partner, type PartnerUser } from '@/lib/partner/types';

interface PartnerShellProps {
  partner: Partner;
  partnerUser: PartnerUser;
  children: React.ReactNode;
}

const PartnerAccessContext = createContext<{ partner: Partner; partnerUser: PartnerUser } | null>(null);

export function usePartnerAccess() {
  return useContext(PartnerAccessContext);
}

export default function PartnerShell({ partner, partnerUser, children }: PartnerShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    fetch('/api/partner/notifications')
      .then((r) => r.json())
      .then((data) => setUnreadCount(data.unreadCount ?? 0))
      .catch(() => setUnreadCount(0));
  }, [pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/partner/login');
    router.refresh();
  };

  const isActive = (href: string) =>
    pathname === href || (href !== '/partner/dashboard' && (pathname?.startsWith(href) ?? false));

  const sidebar = (
    <div className="flex h-full flex-col overflow-hidden bg-white text-slate-800">
      <nav className="relative flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visiblePartnerNavItems(partnerUser, partner).map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                active
                  ? 'bg-secondary font-medium text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-secondary'
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                  active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <Icon name={item.icon as any} size={16} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 mb-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Partner ID</p>
        <p className="mt-1 font-mono text-xs font-semibold text-slate-900">{partner.partner_code}</p>
        <p className="mt-1 text-xs text-slate-500">{PARTNER_TIER_LABELS[partner.tier]}</p>
        <Link
          href="/partner/profile"
          className="mt-3 block rounded-full border border-slate-200 bg-white py-1.5 text-center text-xs font-semibold text-slate-700 hover:border-secondary/40 hover:text-secondary"
        >
          View partner profile
        </Link>
      </div>
    </div>
  );

  return (
    <PartnerAccessContext.Provider value={{ partner, partnerUser }}>
      <div className="admin-shell min-h-screen bg-slate-50">
        <header className="sticky top-0 z-50 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              className="rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold text-white lg:hidden"
              aria-expanded={sidebarOpen}
            >
              {sidebarOpen ? 'Close' : 'Menu'}
            </button>
            <Link href="/partner/dashboard" className="flex min-w-0 items-center" aria-label={partner.company_name}>
              <PartnerBrandMark logoUrl={partner.logo_url} companyName={partner.company_name} size="md" />
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 md:inline-flex">
              {PARTNER_TIER_LABELS[partner.tier]}
            </span>
            <Link
              href="/partner/notifications"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:border-secondary/40 hover:text-secondary"
              aria-label="Notifications"
            >
              <Icon name="BellIcon" size={18} />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <Link
              href="/"
              target="_blank"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-secondary/40 hover:text-secondary"
            >
              <Icon name="ArrowTopRightOnSquareIcon" size={16} />
              <span className="hidden sm:inline">View live site</span>
            </Link>
            <div className="hidden items-center gap-2 pl-1 sm:flex">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-white">
                {partnerUser.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden text-right lg:block">
                <p className="text-sm font-medium text-slate-900">{partnerUser.full_name}</p>
                <p className="text-xs text-slate-500">{partnerUser.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
            >
              <Icon name="ArrowRightOnRectangleIcon" size={16} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        {sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[2px] lg:hidden"
            aria-label="Close menu"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="min-h-[calc(100vh-4rem)] lg:flex">
          <aside
            className={`fixed bottom-0 top-16 z-50 w-72 shrink-0 border-r border-slate-200 bg-white shadow-sm transition-transform duration-200 lg:sticky lg:top-16 lg:z-auto lg:h-[calc(100vh-4rem)] ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}
          >
            {sidebar}
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <main className="w-full min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
              <div className="w-full min-w-0">{children}</div>
            </main>
            <footer className="mt-auto flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white px-4 py-3 text-sm sm:px-6 lg:px-8">
              <PartnerBrandMark logoUrl={partner.logo_url} companyName={partner.company_name} size="sm" />
              <span className="font-mono text-xs font-semibold text-slate-800">{partner.partner_code}</span>
              <span className="text-slate-500">{partner.company_name}</span>
              {partner.joined_at ? (
                <span className="text-xs text-slate-400">
                  Joined {new Date(partner.joined_at).toLocaleDateString('en-IN')}
                </span>
              ) : null}
            </footer>
          </div>
        </div>
      </div>
    </PartnerAccessContext.Provider>
  );
}
