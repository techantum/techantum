'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ADMIN_MAIN_NAV } from '@/lib/cms/admin-nav';

function navLinkClass(active: boolean): string {
  return `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    active
      ? 'bg-primary/10 text-primary'
      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
  }`;
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-4 py-5 border-b border-border">
        <Link href="/admin" className="font-bricolage font-bold text-foreground text-lg">
          TechAntum CMS
        </Link>
        <p className="text-xs text-muted-foreground mt-1">Manage your website</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {ADMIN_MAIN_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={navLinkClass(isActive(item.href, 'exact' in item && item.exact))}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-border space-y-1">
        <Link
          href="/"
          target="_blank"
          className="block px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
        >
          View live site ↗
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-border px-4 h-14 flex items-center justify-between">
        <Link href="/admin" className="font-bricolage font-bold text-foreground">
          TechAntum CMS
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen((open) => !open)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium border border-border"
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      {sidebarOpen && (
        <button
          type="button"
          className="lg:hidden fixed inset-0 z-40 bg-black/40"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="lg:flex min-h-screen">
        <aside
          className={`fixed lg:sticky top-0 z-50 lg:z-auto h-full lg:h-screen w-64 shrink-0 bg-white border-r border-border transform transition-transform duration-200 ${
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
