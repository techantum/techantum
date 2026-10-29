'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import AppHeaderActions from '@/components/AppHeaderActions';
import Icon from '@/components/ui/AppIcon';
import NavIcon from '@/components/ui/NavIcon';
import SafeImage from '@/components/ui/SafeImage';
import type { PlatformRole } from '@/lib/admin/roles';
import type { NavItem } from '@/lib/saas/catalog';
import { homePathForRole } from '@/lib/saas/portals';
import HookoohWidget from '@/components/hookooh/HookoohWidget';
import { APP_NAME } from '@/lib/brand';
import { RESEARCH_PLATFORMS } from '@/lib/research/platforms';

function pathOf(href: string) {
  return href.split('?')[0];
}

function itemIsActive(pathname: string, href: string) {
  const path = pathOf(href);
  if (path === '/youtube') return pathname === '/youtube';
  if (path === '/projects') return pathname === '/projects' || pathname.startsWith('/projects/');
  if (path === '/superadmin') return pathname === '/superadmin';
  if (path === '/admin') return pathname === '/admin';
  if (path === '/youtube/quick-analysis') {
    return pathname.startsWith('/youtube/quick-analysis') || pathname.startsWith('/youtube/quick-research');
  }
  if (path === '/youtube/quick-reports') {
    return pathname.startsWith('/youtube/quick-reports') || pathname.startsWith('/youtube/quick-report');
  }
  if (path === '/home' || path === '/subscriber' || path === '/user') {
    return pathname === path || pathname === '/home';
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

function NavLink({
  item,
  index,
  nested = false,
}: {
  item: NavItem;
  index: number;
  nested?: boolean;
}) {
  const pathname = usePathname() || '';
  const active = itemIsActive(pathname, item.href);
  const className = item.locked
    ? `${nested ? 'pl-11' : ''} flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold text-slate-400 hover:bg-slate-50 hover:text-slate-500 ${active ? 'bg-slate-100 text-slate-500' : ''}`
    : `${nested ? 'pl-11' : ''} flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold ${active ? 'bg-violet-50 text-violet-700' : 'text-slate-500 hover:bg-slate-50'}`;
  return (
    <Link href={item.href} className={className}>
      {nested ? null : <NavIcon name={item.icon} href={item.href} itemKey={item.key} delay={index * 140} locked={item.locked} />}
      <span className="flex-1 truncate">{item.label}</span>
    </Link>
  );
}

function NavGroup({ item, index }: { item: NavItem; index: number }) {
  const pathname = usePathname() || '';
  const children = item.children || [];
  const researchActive = item.href === '/youtube' && (
    pathname.startsWith('/projects')
    || RESEARCH_PLATFORMS.some((platform) => pathname === `/${platform}` || pathname.startsWith(`/${platform}/`))
  );
  const childActive = researchActive || children.some((child) => itemIsActive(pathname, child.href));
  const [open, setOpen] = useState(childActive);

  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  if (!children.length) return <NavLink item={item} index={index} />;

  const rowTone = item.locked
    ? 'text-slate-400 hover:bg-slate-50 hover:text-slate-500'
    : childActive || open
      ? 'bg-violet-50 text-violet-700'
      : 'text-slate-500 hover:bg-slate-50';

  return (
    <div>
      <div className={`flex items-center rounded-2xl ${rowTone}`}>
        <Link href={item.href} className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-sm font-semibold">
          <NavIcon name={item.icon} href={item.href} itemKey={item.key} delay={index * 140} locked={item.locked} />
          <span className="truncate">{item.label}</span>
        </Link>
        <button type="button" className="mr-2 rounded-lg p-1 text-slate-300 hover:text-slate-500" aria-label={`Show ${item.label} pages`} onClick={() => setOpen((value) => !value)}>
          <Icon name={open ? 'ChevronDownIcon' : 'ChevronRightIcon'} size={14} />
        </button>
      </div>
      {open ? (
        <div className="mt-1 space-y-0.5">
          {children.map((child, childIndex) => (
            <NavLink key={`${child.key || child.href}-${childIndex}`} item={child} index={index + childIndex} nested />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function Shell({
  children,
  name,
  email,
  plan,
  role,
  avatarUrl,
  logoUrl,
  companyName,
  nav,
  hookooh,
}: {
  children: React.ReactNode;
  name: string;
  email?: string;
  plan: string;
  role: PlatformRole;
  avatarUrl?: string | null;
  logoUrl?: string | null;
  companyName?: string | null;
  nav: NavItem[];
  hookooh?: boolean;
}) {
  const mark = (
    <span className="flex items-center gap-2">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-sm font-black text-white">
        {(companyName || APP_NAME).charAt(0)}
      </span>
      <span className="font-bricolage text-lg font-bold text-slate-900">{companyName || APP_NAME}</span>
    </span>
  );

  return (
    <div className="min-h-screen bg-[#F6F7FB]">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 overflow-y-auto border-r border-slate-200 bg-white px-4 py-5 lg:block">
        <Link href={homePathForRole(role)} className="flex items-center px-2">
          {logoUrl ? (
            <SafeImage src={logoUrl} alt={companyName || APP_NAME} className="h-12 w-auto max-w-[180px] object-contain object-left" fallback={mark} priority />
          ) : (
            mark
          )}
        </Link>
        <nav className="mt-6 space-y-1">
          {nav.map((item, index) => (
            <NavGroup key={`${item.key || item.href}-${item.locked ? 'missing' : 'on'}`} item={item} index={index} />
          ))}
        </nav>
      </aside>

      <header className="fixed inset-x-0 top-0 z-[60] flex h-16 items-center justify-end gap-2 border-b border-slate-100 bg-white/95 px-4 text-sm backdrop-blur sm:px-6 lg:left-64 lg:px-8">
        {role !== 'SUPER_ADMIN' && plan ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
            <Icon name="ChartBarIcon" size={12} /> {plan}
          </span>
        ) : null}
        <AppHeaderActions name={name} email={email} avatarUrl={avatarUrl} role={role} />
      </header>

      <div className="pt-16 lg:pl-64">
        <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
          {nav.flatMap((item) => (item.children?.length ? [item, ...item.children] : [item])).map((item, index) => (
            <NavLink key={`${item.key || item.href}-m-${index}`} item={item} index={index} />
          ))}
        </nav>
        <main className={`px-4 pt-6 sm:px-6 lg:px-8 ${hookooh ? 'pb-28' : 'pb-8'}`}>{children}</main>
      </div>
      {hookooh ? <HookoohWidget /> : null}
    </div>
  );
}
