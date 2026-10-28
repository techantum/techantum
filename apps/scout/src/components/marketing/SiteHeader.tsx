'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { SHELL } from './layout';
import type { RevealeoBranding } from '@/lib/cms/defaults';
import { APP_NAME } from '@/lib/brand';
import SafeImage from '@/components/ui/SafeImage';
import NavIcon from '@/components/ui/NavIcon';

const LINKS = [
  { href: '/#product', label: 'Product', icon: 'SparklesIcon', key: 'product' },
  { href: '/#features', label: 'Features', icon: 'Squares2X2Icon', key: 'features' },
  { href: '/#solutions', label: 'Solutions', icon: 'LightBulbIcon', key: 'solutions' },
  { href: '/#faq', label: 'Resources', icon: 'BookOpenIcon', key: 'resources' },
  { href: '/#pricing', label: 'Pricing', icon: 'CreditCardIcon', key: 'pricing' },
];

function HeaderAvatar({ name, src }: { name: string; src?: string | null }) {
  const letter = (name || 'U').charAt(0).toUpperCase();
  const fallback = (
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#7C3AED] text-sm font-bold text-white">
      {letter}
    </span>
  );
  if (!src) return fallback;
  return <SafeImage src={src} alt="" className="h-10 w-10 rounded-full object-cover" fallback={fallback} />;
}

export default function SiteHeader({
  solid = false,
  branding,
  signedIn = false,
  userName = '',
  userEmail = '',
  avatarUrl = null,
  canOpenWorkspace = false,
}: {
  solid?: boolean;
  branding?: RevealeoBranding | null;
  signedIn?: boolean;
  userName?: string;
  userEmail?: string;
  avatarUrl?: string | null;
  canOpenWorkspace?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const workspaceHref = canOpenWorkspace ? '/home' : '/trial';

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const profileMenu = (
    <div className="absolute right-0 top-12 z-[80] w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-xl">
      <div className="flex items-center gap-3 px-4 py-3">
        <HeaderAvatar name={userName} src={avatarUrl} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{userName || 'Account'}</p>
          {userEmail ? <p className="truncate text-xs text-slate-500">{userEmail}</p> : null}
        </div>
      </div>
      <Link href="/profile" className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50" onClick={() => setMenuOpen(false)}>
        <NavIcon name="PencilSquareIcon" itemKey="profile" className="h-7 w-7 rounded-lg" size={14} />
        Edit profile
      </Link>
      <Link href={workspaceHref} className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50" onClick={() => setMenuOpen(false)}>
        <NavIcon name="Squares2X2Icon" itemKey="features" className="h-7 w-7 rounded-lg" size={14} delay={80} />
        Go to workspace
      </Link>
      <form action="/api/auth/logout" method="post">
        <button type="submit" className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50">
          <NavIcon name="ArrowRightOnRectangleIcon" itemKey="logout" className="h-7 w-7 rounded-lg" size={14} delay={160} />
          Sign out
        </button>
      </form>
    </div>
  );

  return (
    <>
    <header className={`fixed inset-x-0 top-0 z-50 bg-white/95 shadow-sm backdrop-blur ${solid ? 'border-b border-slate-100' : 'border-b border-slate-100/80'}`}>
      <div className={`${SHELL} flex h-20 items-center justify-between gap-3`}>
        <Link href="/" className="flex shrink-0 items-center font-bricolage text-[22px] font-bold tracking-tight text-slate-900">
          {branding?.logo_url ? (
            <SafeImage
              src={branding.logo_url}
              alt={branding.company_name || APP_NAME}
              className="h-12 w-auto max-w-[220px] object-contain object-left sm:h-14 sm:max-w-[260px]"
              fallback={branding?.company_name || APP_NAME}
              priority
            />
          ) : (
            branding?.company_name || APP_NAME
          )}
        </Link>
        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-6 text-[13.5px] font-medium text-slate-500 lg:flex">
          {LINKS.map((link, index) => (
            <Link key={link.href} href={link.href} className="inline-flex items-center gap-1.5 hover:text-slate-900">
              <NavIcon name={link.icon} itemKey={link.key} delay={index * 120} className="h-7 w-7 rounded-lg" size={14} />
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 lg:hidden" onClick={() => setOpen(!open)}>
            <NavIcon name={open ? 'XMarkIcon' : 'Bars3Icon'} itemKey="product" className="h-8 w-8 rounded-xl" size={16} />
            Menu
          </button>
          {signedIn ? (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                className="rounded-full p-0.5 ring-2 ring-transparent hover:ring-violet-100"
                aria-label="Profile menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((value) => !value)}
              >
                <HeaderAvatar name={userName} src={avatarUrl} />
              </button>
              {menuOpen ? profileMenu : null}
            </div>
          ) : (
            <div className="hidden items-center gap-2.5 lg:flex">
              <Link href="/login" className="btn-secondary">
                Sign in
              </Link>
              <Link href="/signup" className="btn-primary">
                Start free trial
              </Link>
            </div>
          )}
        </div>
      </div>
      {open ? (
        <div className="border-t border-slate-100 bg-white py-4 lg:hidden">
          <div className={`${SHELL} flex flex-col gap-3 text-sm font-medium text-slate-700`}>
            {LINKS.map((link, index) => (
              <Link key={link.href} href={link.href} className="inline-flex items-center gap-2" onClick={() => setOpen(false)}>
                <NavIcon name={link.icon} itemKey={link.key} delay={index * 120} className="h-7 w-7 rounded-lg" size={14} />
                {link.label}
              </Link>
            ))}
            {signedIn ? null : (
              <>
                <Link href="/login" className="btn-secondary" onClick={() => setOpen(false)}>
                  Sign in
                </Link>
                <Link href="/signup" className="btn-primary text-center" onClick={() => setOpen(false)}>
                  Start free trial
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
    <div className="h-20" aria-hidden />
    </>
  );
}
