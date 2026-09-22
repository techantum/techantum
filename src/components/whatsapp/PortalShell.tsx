'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const NAV: { href: string; label: string; primary?: boolean }[] = [
  { href: '/portal/wa', label: 'Dashboard' },
  { href: '/portal/wa/onboard', label: 'WhatsApp Business API Onboarding', primary: true },
  { href: '/portal/wa/phones', label: 'WhatsApp Numbers' },
  { href: '/portal/wa/templates', label: 'Templates' },
  { href: '/portal/wa/messages', label: 'Messages' },
  { href: '/portal/wa/inbox', label: 'Inbox' },
  { href: '/portal/wa/contacts', label: 'Contacts' },
  { href: '/portal/wa/campaigns', label: 'Campaigns' },
  { href: '/portal/wa/automations', label: 'Automations' },
  { href: '/portal/wa/analytics', label: 'Analytics' },
  { href: '/portal/wa/integrations', label: 'Integrations' },
  { href: '/portal/wa/billing', label: 'Billing' },
  { href: '/portal/wa/support', label: 'Support' },
];

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email || data.user?.phone || '');
    });
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const isActive = (href: string) => {
    if (href === '/portal/wa') return pathname === '/portal/wa';
    if (href === '/portal/wa/onboard') return pathname === '/portal/wa/onboard' || pathname === '/portal/wa/connect';
    return pathname === href || Boolean(pathname?.startsWith(`${href}/`));
  };

  const nav = (
    <nav className="space-y-1">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`block rounded-lg px-3 py-2 text-sm ${
            item.primary
              ? isActive(item.href)
                ? 'bg-indigo-600 text-white font-semibold'
                : 'border border-indigo-100 bg-indigo-50 font-semibold text-indigo-800 hover:bg-indigo-100'
              : isActive(item.href)
                ? 'bg-indigo-50 text-indigo-800 font-medium'
                : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-800'
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between">
        <p className="font-bricolage font-bold text-slate-900">WhatsApp Portal</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={signOut} className="text-xs font-semibold text-slate-600 hover:text-rose-700">
            Sign out
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
          >
            Menu
          </button>
        </div>
      </div>

      {menuOpen && (
        <button type="button" className="lg:hidden fixed inset-0 z-30 bg-black/40" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white px-4 py-6 flex flex-col transform transition-transform lg:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <p className="font-bricolage font-bold text-lg text-slate-900">Client Portal</p>
        <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-6">WhatsApp Business API</p>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        <div className="pt-4 mt-4 border-t border-slate-200 space-y-2">
          {email && <p className="px-3 text-xs text-slate-500 truncate">{email}</p>}
          <button
            type="button"
            onClick={signOut}
            className="w-full rounded-lg px-3 py-2 text-sm font-semibold text-left text-rose-700 hover:bg-rose-50"
          >
            Sign out
          </button>
          <Link href="/" className="block px-3 text-xs text-slate-400 hover:text-slate-700">
            Back to website
          </Link>
        </div>
      </aside>

      <main className="lg:pl-72">
        <header className="hidden lg:flex items-center justify-end gap-4 bg-white border-b border-slate-200 px-6 h-14">
          {email && <p className="text-sm text-slate-600 truncate max-w-xs">{email}</p>}
          <button type="button" onClick={signOut} className="text-sm font-semibold text-slate-700 hover:text-rose-700">
            Sign out
          </button>
        </header>
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-5">{children}</div>
      </main>
    </div>
  );
}
