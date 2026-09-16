'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ADMIN_NAV_GROUPS } from '@/lib/cms/admin-nav';
import Icon from '@/components/ui/AppIcon';

function isNavActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function groupHasActiveItem(pathname: string, groupId: string) {
  const group = ADMIN_NAV_GROUPS.find((g) => g.id === groupId);
  return group?.items.some((item) => isNavActive(pathname, item.href, item.exact)) ?? false;
}

function openGroupsForPath(pathname: string) {
  return Object.fromEntries(ADMIN_NAV_GROUPS.map((g) => [g.id, groupHasActiveItem(pathname, g.id)]));
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => openGroupsForPath(pathname));
  const [appointmentCount, setAppointmentCount] = useState(0);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    setOpenGroups(openGroupsForPath(pathname));
  }, [pathname]);

  useEffect(() => {
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
  }, [pathname]);

  const activeGroupId = useMemo(
    () => ADMIN_NAV_GROUPS.find((g) => groupHasActiveItem(pathname, g.id))?.id,
    [pathname]
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  };

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const sidebar = (
    <div className="relative flex flex-col h-full overflow-hidden text-white">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-indigo-950 to-cyan-950" />
      <div className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-fuchsia-500/25 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -left-16 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 right-0 h-36 w-36 rounded-full bg-amber-400/15 blur-3xl" />

      <div className="relative px-5 py-6 border-b border-white/10">
        <Link href="/admin" className="flex items-center gap-3 group">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-indigo-500/40 group-hover:scale-105 transition-transform">
            <Icon name="SparklesIcon" size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bricolage font-bold text-lg leading-tight">TechAntum CMS</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/70">Command center</p>
          </div>
        </Link>
      </div>

      <nav className="relative flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {ADMIN_NAV_GROUPS.map((group) => {
          const isOpen = openGroups[group.id];
          const isGroupActive = activeGroupId === group.id;

          return (
            <div key={group.id} className="rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all ${
                  isGroupActive
                    ? 'bg-gradient-to-r from-white/15 via-cyan-400/10 to-fuchsia-400/10 text-white shadow-inner border border-white/10'
                    : 'text-indigo-100/90 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                      isGroupActive
                        ? 'bg-gradient-to-br from-cyan-400 to-indigo-500 text-white'
                        : 'bg-white/5 text-indigo-200/80'
                    }`}
                  >
                    <Icon name={group.icon} size={16} />
                  </span>
                  {group.label}
                </span>
                <Icon
                  name="ChevronDownIcon"
                  size={16}
                  className={`text-indigo-200/70 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <div
                className={`grid transition-all duration-200 ${
                  isOpen ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="space-y-0.5 pl-2 pb-1">
                    {group.items.map((item) => {
                      const active = isNavActive(pathname, item.href, item.exact);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all border-l-2 ${
                            active
                              ? 'border-cyan-300 bg-white/10 text-white font-medium shadow-sm'
                              : 'border-transparent text-indigo-100/75 hover:bg-white/5 hover:text-white hover:border-cyan-300/50'
                          }`}
                        >
                          <Icon name={item.icon} size={16} className={active ? 'text-cyan-200' : 'text-indigo-300/60'} />
                          <span className="flex-1">{item.label}</span>
                          {item.href === '/admin/whatsapp/appointments' && appointmentCount > 0 ? (
                            <span className="min-w-[1.25rem] rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-1.5 py-0.5 text-center text-[10px] font-bold text-slate-900">
                              {appointmentCount}
                            </span>
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      <div className="relative px-3 py-4 border-t border-white/10 space-y-1">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-indigo-100/80 hover:bg-white/10 hover:text-white transition-all"
        >
          <Icon name="ArrowTopRightOnSquareIcon" size={16} />
          View live site
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-indigo-100/80 hover:bg-rose-500/20 hover:text-rose-100 transition-all"
        >
          <Icon name="ArrowRightOnRectangleIcon" size={16} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="admin-shell min-h-screen relative">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-indigo-50 to-cyan-50" />
        <div className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-violet-300/30 blur-3xl" />
        <div className="absolute top-1/3 right-0 h-80 w-80 rounded-full bg-cyan-300/25 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="absolute inset-0 admin-grid-bg opacity-40" />
      </div>

      <div className="lg:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-indigo-100/70 px-4 h-14 flex items-center justify-between">
        <Link href="/admin" className="font-bricolage font-bold bg-gradient-to-r from-indigo-700 to-fuchsia-600 bg-clip-text text-transparent">
          TechAntum CMS
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen((open) => !open)}
          className="px-3 py-1.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 shadow-md shadow-indigo-500/20"
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      {sidebarOpen && (
        <button
          type="button"
          className="lg:hidden fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="lg:flex min-h-screen">
        <aside
          className={`fixed lg:sticky top-0 z-50 lg:z-auto h-full lg:h-screen w-72 shrink-0 shadow-2xl shadow-indigo-950/20 transform transition-transform duration-200 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          {sidebar}
        </aside>

        <main className="flex-1 min-w-0 w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
