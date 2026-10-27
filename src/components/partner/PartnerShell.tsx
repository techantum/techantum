'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';
import PartnerBrandMark from '@/components/partner/PartnerBrandMark';
import { firstAllowedPartnerHref, visiblePartnerNavItems } from '@/lib/partner/nav';
import YoutubeResearchNav from '@/components/partner/YoutubeResearchNav';
import type { Partner, PartnerUser } from '@/lib/partner/types';

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
  const menuRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setSidebarOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    fetch('/api/partner/notifications?countOnly=1')
      .then((r) => r.json())
      .then((data) => setUnreadCount(data.unreadCount ?? 0))
      .catch(() => setUnreadCount(0));
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointer = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    setMenuOpen(false);
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
          const youtube = item.key === 'youtube-research';
          const youtubeChild = Boolean(pathname?.startsWith('/partner/youtube-research/'));
          const active = youtube
            ? Boolean(pathname === '/partner/youtube-research' || pathname === '/partner/youtube-research/') && !youtubeChild
            : isActive(item.href);
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={`side-nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? 'bg-[#fdecea] font-medium text-secondary'
                    : 'text-slate-600 hover:bg-[#fff5f3] hover:text-secondary'
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    active ? 'bg-[#fdecea] text-secondary' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Icon name={item.icon as any} size={16} />
                </span>
                {item.label}
              </Link>
              {youtube ? (
                <div className="ml-5 border-l border-slate-200 pl-3">
                  <YoutubeResearchNav />
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-slate-100 p-3">
        <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Icon name="ChatBubbleLeftRightIcon" size={16} className="text-secondary" />
            Need help?
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">Get support or share feedback with our team.</p>
          <Link
            href="/partner/support"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:underline"
          >
            Contact Support →
          </Link>
        </div>
        <Link
          href="/partner/profile"
          className="mt-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
          aria-label="Profile settings"
        >
          <Icon name="Cog6ToothIcon" size={16} />
        </Link>
      </div>
    </div>
  );

  return (
    <PartnerAccessContext.Provider value={{ partner, partnerUser }}>
      <div className="admin-shell partner-shell min-h-screen bg-slate-50">
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
            <Link href={firstAllowedPartnerHref(partnerUser, partner)} className="flex min-w-0 items-center" aria-label={partner.company_name}>
              <PartnerBrandMark logoUrl={partner.logo_url} companyName={partner.company_name} size="md" />
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/"
              target="_blank"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-secondary/40 hover:text-secondary"
            >
              <Icon name="ArrowTopRightOnSquareIcon" size={16} />
              <span className="hidden sm:inline">View live site</span>
            </Link>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="inline-flex max-w-[16rem] items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-left hover:border-secondary/40"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-white">
                  {partnerUser.full_name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden min-w-0 lg:block">
                  <span className="block truncate text-sm font-medium text-slate-900">{partnerUser.full_name}</span>
                  <span className="block truncate text-xs text-slate-500">{partnerUser.email}</span>
                </span>
                <Icon name="ChevronDownIcon" size={14} className={`text-slate-400 ${menuOpen ? 'rotate-180' : ''}`} />
              </button>
              {menuOpen ? (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-lg" role="menu">
                  <Link
                    href="/partner/profile"
                    className="menu-item flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Icon name="UserCircleIcon" size={16} />
                    Profile
                  </Link>
                  <Link
                    href="/partner/support"
                    className="menu-item flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Icon name="LifebuoyIcon" size={16} />
                    Partner Support
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="menu-item flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-rose-50 hover:text-rose-600"
                    role="menuitem"
                  >
                    <Icon name="ArrowRightOnRectangleIcon" size={16} />
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
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
