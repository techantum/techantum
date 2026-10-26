'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import { isSuperAdmin, isSubscriberAdmin, roleLabel, type PlatformRole } from '@/lib/admin/roles';

export default function Shell({
  children,
  name,
  plan,
  role,
}: {
  children: React.ReactNode;
  name: string;
  plan: string;
  role: PlatformRole;
}) {
  const pathname = usePathname() || '';
  const nav = [
    { href: '/home', label: 'Home', icon: 'HomeIcon', show: true },
    { href: '/youtube', label: 'YouTube Research', icon: 'PlayCircleIcon', show: true },
    { href: '/leads', label: 'Lead Discovery', icon: 'MapPinIcon', show: true },
    { href: '/youtube/settings', label: 'YouTube Settings', icon: 'KeyIcon', show: isSuperAdmin(role) },
    { href: '/subscribers', label: 'Subscribers', icon: 'BuildingOffice2Icon', show: isSuperAdmin(role) },
    { href: '/team', label: 'Team', icon: 'UsersIcon', show: isSubscriberAdmin(role) },
    { href: '/billing', label: 'Billing', icon: 'CreditCardIcon', show: isSubscriberAdmin(role) },
    { href: '/settings', label: 'Settings', icon: 'Cog6ToothIcon', show: true },
  ];
  const links = nav.filter((item) => item.show);
  const itemClass = (href: string) => {
    const active =
      pathname === href ||
      (href !== '/youtube' && pathname.startsWith(`${href}/`)) ||
      (href === '/youtube' && pathname.startsWith('/youtube') && !pathname.startsWith('/youtube/settings'));
    return `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 overflow-y-auto border-r border-slate-200 bg-white px-4 py-5 lg:block">
        <Link href="/home" className="flex items-center gap-2 px-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-sm font-black text-white">R</span>
          <span className="font-bricolage text-lg font-bold text-slate-900">Revealeo</span>
        </Link>
        <nav className="mt-6 space-y-1">
          {links.map((item) => (
            <Link key={item.href} href={item.href} className={itemClass(item.href)}>
              <Icon name={item.icon} size={18} /> {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <header className="fixed inset-x-0 top-0 z-[60] flex h-14 items-center justify-end gap-3 border-b border-slate-200 bg-white px-4 text-sm sm:px-6 lg:left-64 lg:px-8">
        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold capitalize text-indigo-700">{plan}</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{roleLabel(role)}</span>
        <span className="font-medium text-slate-700">{name}</span>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="font-semibold text-slate-500 hover:text-slate-800">Sign out</button>
        </form>
      </header>

      <div className="pt-14 lg:pl-64">
        <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
          {links.map((item) => (
            <Link key={item.href} href={item.href} className={`${itemClass(item.href)} shrink-0`}>
              {item.label}
            </Link>
          ))}
        </nav>
        <main className="px-4 pb-8 pt-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
