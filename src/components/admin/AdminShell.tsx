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

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ADMIN_NAV_GROUPS.map((g) => [g.id, g.defaultOpen ?? false]))
  );

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const group of ADMIN_NAV_GROUPS) {
        if (groupHasActiveItem(pathname, group.id)) {
          next[group.id] = true;
        }
      }
      return next;
    });
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
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white">
      <div className="px-5 py-6 border-b border-white/10">
        <Link href="/admin" className="flex items-center gap-3 group">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
            <Icon name="SparklesIcon" size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bricolage font-bold text-lg leading-tight">TechAntum CMS</p>
            <p className="text-xs text-indigo-200/70">Manage your website</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {ADMIN_NAV_GROUPS.map((group) => {
          const isOpen = openGroups[group.id];
          const isGroupActive = activeGroupId === group.id;
          const isSingleItem = group.items.length === 1;

          if (isSingleItem) {
            const item = group.items[0];
            const active = isNavActive(pathname, item.href, item.exact);
            return (
              <Link
                key={group.id}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? 'bg-white/15 text-white shadow-inner border border-white/10'
                    : 'text-indigo-100/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon name={item.icon} size={18} className={active ? 'text-indigo-200' : 'text-indigo-300/70'} />
                {item.label}
              </Link>
            );
          }

          return (
            <div key={group.id} className="rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                  isGroupActive
                    ? 'bg-white/10 text-white'
                    : 'text-indigo-100/90 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon name={group.icon} size={18} className="text-indigo-300/80" />
                  {group.label}
                </span>
                <Icon
                  name="ChevronDownIcon"
                  size={16}
                  className={`text-indigo-300/70 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all border-l-2 ${
                            active
                              ? 'border-indigo-400 bg-indigo-500/20 text-white font-medium'
                              : 'border-transparent text-indigo-100/75 hover:bg-white/5 hover:text-white hover:border-indigo-400/40'
                          }`}
                        >
                          <Icon name={item.icon} size={16} className={active ? 'text-indigo-200' : 'text-indigo-300/60'} />
                          {item.label}
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

      <div className="px-3 py-4 border-t border-white/10 space-y-1">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/20">
      <div className="lg:hidden sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-border px-4 h-14 flex items-center justify-between">
        <Link href="/admin" className="font-bricolage font-bold text-foreground">
          TechAntum CMS
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen((open) => !open)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium border border-border hover:bg-muted"
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      {sidebarOpen && (
        <button
          type="button"
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="lg:flex min-h-screen">
        <aside
          className={`fixed lg:sticky top-0 z-50 lg:z-auto h-full lg:h-screen w-72 shrink-0 shadow-2xl transform transition-transform duration-200 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          {sidebar}
        </aside>

        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
