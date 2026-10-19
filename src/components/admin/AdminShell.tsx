'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ADMIN_NAV, visibleAdminNav, type AdminNavItem } from '@/lib/cms/admin-nav';
import type { AdminRole } from '@/lib/admin/roles';
import Icon from '@/components/ui/AppIcon';

function isNavActive(pathname: string, href: string, exact?: boolean, activePaths?: string[]) {
  const onHref = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  if (onHref) return true;
  return activePaths?.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ?? false;
}

function itemTreeActive(pathname: string, item: AdminNavItem): boolean {
  if (item.href && isNavActive(pathname, item.href, item.exact, item.activePaths)) return true;
  return item.children?.some((child) => itemTreeActive(pathname, child)) ?? false;
}

function nodeKey(trail: string[], item: AdminNavItem) {
  return [...trail, item.id || item.label].join('/');
}

function openNodesForPath(pathname: string) {
  const open: Record<string, boolean> = {};
  const walk = (items: AdminNavItem[], trail: string[]) => {
    for (const item of items) {
      if (!item.children?.length) continue;
      const key = nodeKey(trail, item);
      if (itemTreeActive(pathname, item)) open[key] = true;
      walk(item.children, [...trail, item.id || item.label]);
    }
  };
  walk(ADMIN_NAV, []);
  return open;
}

export default function AdminShell({
  children,
  role = 'ADMIN',
  logoUrl,
  logoLetter = 'T',
  companyName = 'TechAntum',
}: {
  children: React.ReactNode;
  role?: AdminRole;
  logoUrl?: string | null;
  logoLetter?: string;
  companyName?: string;
}) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const supabase = createClient();
  const navItems = useMemo(() => visibleAdminNav(role), [role]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openNodes, setOpenNodes] = useState<Record<string, boolean>>(() => openNodesForPath(pathname));
  const [appointmentCount, setAppointmentCount] = useState(0);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    setOpenNodes((prev) => ({ ...prev, ...openNodesForPath(pathname) }));
  }, [pathname]);

  useEffect(() => {
    if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') return;
    let cancelled = false;
    const loadAppointments = async () => {
      try {
        const res = await fetch('/api/admin/whatsapp/appointments?status=SCHEDULED', { cache: 'no-store' });
        if (!res.ok) return;
        const payload = await res.json();
        const rows = Array.isArray(payload) ? payload : [];
        if (!cancelled) setAppointmentCount(rows.length);
      } catch {
        if (!cancelled) setAppointmentCount(0);
      }
    };
    void loadAppointments();
    const timer = window.setInterval(loadAppointments, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pathname, role]);

  const handleSignOut = async () => {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => undefined);
    await supabase.auth.signOut().catch(() => undefined);
    router.push('/admin/login');
    router.refresh();
  };

  const brandMark = logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt={companyName} className="h-12 w-auto object-contain" />
  ) : (
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient shadow-sm">
      <span className="font-bricolage text-lg font-bold text-primary-foreground">{logoLetter}</span>
    </div>
  );

  const renderNodes = (items: AdminNavItem[], trail: string[], depth: number) =>
    items.map((item) => {
      const key = nodeKey(trail, item);
      const nextTrail = [...trail, item.id || item.label];

      if (item.children?.length) {
        const open = Boolean(openNodes[key]);
        const active = itemTreeActive(pathname, item);
        const isMain = depth === 0;
        return (
          <div key={key} className={isMain ? 'overflow-hidden rounded-2xl' : undefined}>
            <button
              type="button"
              onClick={() => setOpenNodes((prev) => ({ ...prev, [key]: !prev[key] }))}
              className={
                isMain
                  ? `flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                      active ? 'bg-orange-50 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-secondary'
                    }`
                  : `flex w-full items-center justify-between gap-2 rounded-xl py-2 pr-3 text-sm font-medium transition-colors ${
                      active ? 'text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-secondary'
                    }`
              }
              style={isMain ? undefined : { paddingLeft: 8 + depth * 10 }}
            >
              <span className="flex min-w-0 items-center gap-2">
                {isMain ? (
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                      active ? 'bg-secondary text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Icon name={item.icon} size={16} />
                  </span>
                ) : (
                  <Icon name={item.icon} size={15} className={`shrink-0 ${active ? 'text-secondary' : 'text-slate-400'}`} />
                )}
                <span className="text-left leading-tight">{item.label}</span>
              </span>
              <Icon
                name="ChevronDownIcon"
                size={isMain ? 16 : 14}
                className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
              />
            </button>
            {open ? <div className={`space-y-0.5 ${isMain ? 'pb-1 pl-2' : ''}`}>{renderNodes(item.children, nextTrail, depth + 1)}</div> : null}
          </div>
        );
      }

      const href = item.href || '#';
      const active = item.href ? isNavActive(pathname, item.href, item.exact, item.activePaths) : false;
      return (
        <Link
          key={key}
          href={href}
          className={`flex items-center gap-2 rounded-xl border-l-2 py-2 pr-3 text-sm transition-colors ${
            active
              ? 'border-secondary bg-secondary font-medium text-white shadow-sm'
              : 'border-transparent text-slate-600 hover:border-secondary/40 hover:bg-slate-50 hover:text-secondary'
          }`}
          style={{ paddingLeft: 8 + depth * 10 }}
        >
          <Icon name={item.icon} size={15} className={`shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
          <span className="min-w-0 flex-1 text-left leading-tight">{item.label}</span>
          {item.href === '/admin/whatsapp/appointments' && appointmentCount > 0 ? (
            <span
              className={`min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold ${
                active ? 'bg-white text-secondary' : 'bg-secondary text-white'
              }`}
            >
              {appointmentCount}
            </span>
          ) : null}
        </Link>
      );
    });

  const sidebar = (
    <div className="flex h-full flex-col overflow-hidden bg-white text-slate-800">
      <nav className="relative flex-1 space-y-1 overflow-y-auto px-3 py-4">{renderNodes(navItems, [], 0)}</nav>
    </div>
  );

  return (
    <div className="admin-shell min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-5 print:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
            className="rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold text-white lg:hidden"
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? 'Close' : 'Menu'}
          </button>
          <Link href="/admin" className="flex items-center" aria-label={companyName}>
            {brandMark}
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 md:inline-flex">
            {role === 'SUPER_ADMIN' ? 'Super admin' : 'Developer admin'}
          </span>
          {role === 'SUPER_ADMIN' ? (
            <Link
              href="/admin/profile"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-secondary/40 hover:text-secondary"
            >
              <Icon name="UserCircleIcon" size={16} />
              <span className="hidden sm:inline">Profile</span>
            </Link>
          ) : null}
          <Link
            href="/"
            target="_blank"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-secondary/40 hover:text-secondary"
          >
            <Icon name="ArrowTopRightOnSquareIcon" size={16} />
            <span className="hidden sm:inline">View live site</span>
          </Link>
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
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[2px] print:hidden lg:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="min-h-[calc(100vh-4rem)] lg:flex">
        <aside
          className={`fixed bottom-0 top-16 z-50 w-80 shrink-0 border-r border-slate-200 bg-white shadow-sm transition-transform duration-200 print:hidden lg:sticky lg:top-16 lg:z-auto lg:h-[calc(100vh-4rem)] ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          {sidebar}
        </aside>

        <main className="w-full min-w-0 flex-1 px-4 py-5 print:px-0 print:py-0 sm:px-6 lg:px-8">
          <div className="w-full min-w-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
