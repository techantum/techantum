'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';
import { PARTNER_TIER_LABELS, type Partner, type PartnerUser } from '@/lib/partner/types';

const PARTNER_NAV = [
  { href: '/partner/dashboard', label: 'Dashboard', icon: 'Squares2X2Icon' },
  { href: '/partner/packages', label: 'Service Packages', icon: 'CubeIcon' },
  { href: '/partner/requirements/new', label: 'New Requirement', icon: 'PlusCircleIcon' },
  { href: '/partner/requirements', label: 'My Requirements', icon: 'ClipboardDocumentListIcon' },
  { href: '/partner/documents', label: 'Documents', icon: 'DocumentTextIcon' },
  { href: '/partner/team', label: 'Team', icon: 'UsersIcon', adminOnly: true },
  { href: '/partner/support', label: 'Partner Support', icon: 'LifebuoyIcon' },
] as const;

interface PartnerShellProps {
  partner: Partner;
  partnerUser: PartnerUser;
  children: React.ReactNode;
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
    <div className="flex flex-col h-full bg-[#1e1b4b] text-white">
      <div className="px-5 py-6 border-b border-white/10">
        <Link href="/partner/dashboard" className="block">
          <p className="font-bricolage font-bold text-lg tracking-tight">TechAntum</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-indigo-300 mt-0.5">
            Partner Portal
          </p>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {PARTNER_NAV.filter(
          (item) => !('adminOnly' in item && item.adminOnly) || partnerUser.role === 'partner_admin'
        ).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive(item.href)
                ? 'bg-indigo-500/30 text-white'
                : 'text-indigo-200 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon name={item.icon as any} size={20} className="shrink-0 opacity-80" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-white/10 mx-3 mb-3 rounded-xl bg-white/5">
        <p className="text-[10px] uppercase tracking-wider text-indigo-300 mb-1">Partner ID</p>
        <p className="font-mono text-xs font-semibold text-white mb-2">{partner.partner_code}</p>
        <p className="text-xs text-indigo-200">{PARTNER_TIER_LABELS[partner.tier]}</p>
        <Link
          href="/partner/profile"
          className="mt-3 block text-center text-xs font-medium text-indigo-300 hover:text-white transition-colors py-1.5 rounded-lg border border-white/10 hover:border-white/20"
        >
          View Partner Profile
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between">
        <Link href="/partner/dashboard" className="font-bricolage font-bold text-[#1e1b4b]">
          Partner Portal
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen((o) => !o)}
          className="p-2 rounded-lg border border-slate-200"
        >
          <Icon name="Bars3Icon" size={20} />
        </button>
      </div>

      {sidebarOpen && (
        <button
          type="button"
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="lg:flex min-h-screen">
        <aside
          className={`fixed lg:sticky top-0 z-50 lg:z-auto h-full lg:h-screen w-64 shrink-0 transform transition-transform duration-200 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          {sidebar}
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          {/* Top bar */}
          <header className="hidden lg:flex items-center justify-between bg-white border-b border-slate-200 px-6 h-14 shrink-0">
            <div>
              <p className="text-xs text-slate-500">Dashboard</p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/" target="_blank" className="text-sm text-slate-500 hover:text-indigo-600">
                techantum.com ↗
              </Link>
              <Link
                href="/partner/notifications"
                className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                aria-label="Notifications"
              >
                <Icon name="BellIcon" size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">
                  {partnerUser.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900">{partnerUser.full_name}</p>
                  <p className="text-xs text-slate-500">{PARTNER_TIER_LABELS[partner.tier]}</p>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="ml-2 text-xs text-slate-500 hover:text-red-600"
                >
                  Sign out
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
